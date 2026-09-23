// The tool previews on the Nokime site: each tool filmed for real. Loads a page in an off-screen
// WKWebView (light by default, no stored data), plays a scene from tools/previews/<tool>.js — cursor
// moves, clicks, eased scrolling, anything the scene does per frame — snapshots every frame at 60 fps
// and writes an H.264 MP4 and a JPEG poster with AVFoundation (there is no ffmpeg on this machine).
//
//   swiftc -O tools/preview.swift -o /tmp/preview
//   /tmp/preview <url> <fr|en> media/<tool>-preview-<lang> tools/previews/<tool>.js [dark]
//
// Each scene file names the page it films at its top. FRAMES=30,90,200 writes those frames as PNGs
// next to the output. Any error in a scene stops the run with exit 4, so a broken take never ships.
import AVFoundation
import Cocoa
import WebKit

let args = CommandLine.arguments
guard args.count >= 5 else { FileHandle.standardError.write("usage: preview <url> <fr|en> <out-prefix> <scene.js> [dark]\n".data(using: .utf8)!); exit(1) }
let URLSTR = args[1], LANG = args[2], OUT = args[3], SCENE = args[4]
let DARK = args.count > 5 && args[5] == "dark"
let VW: CGFloat = 1280, VH: CGFloat = 900, ZOOM: CGFloat = 0.88
let OW = 1280, OH = 900, FPS: Int32 = 60, FADE = 0.5
let debugFrames = Set((ProcessInfo.processInfo.environment["FRAMES"] ?? "").split(separator: ",").compactMap { Int($0) })

let ENGINE = #"""
(function(){
  window.__H={
    $:s=>document.querySelector(s), $$:s=>[...document.querySelectorAll(s)],
    ctr:el=>{const r=el.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]},
    below:(el,fx,dy)=>{const r=el.getBoundingClientRect();return [r.left+r.width*(fx==null?.5:fx),r.bottom+(dy==null?14:dy)]},
    btn:(root,re)=>[...root.querySelectorAll('button, a')].find(b=>re.test(b.textContent)),
    type:(el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},
    pick:(el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},
    top:el=>el.getBoundingClientRect().top+scrollY,
  };
  window.__engine=function(cfg){
    const st=document.createElement('style'); st.textContent='html,body{scroll-behavior:auto!important}'; document.head.append(st);
    const dark=cfg.cursor!=='light';
    const cur=document.createElement('div');
    cur.innerHTML='<svg width="22" height="28" viewBox="0 0 22 28"><path d="M2 2v21l5.2-5 3.6 8.2 3.4-1.5-3.6-8H18z" fill="'+(dark?'#1B1E17':'#F1F0EA')+'" stroke="'+(dark?'#FFFFFF':'#15170F')+'" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    Object.assign(cur.style,{position:'fixed',left:'0',top:'0',zIndex:2147483647,pointerEvents:'none'});
    const rip=document.createElement('div');
    Object.assign(rip.style,{position:'fixed',width:'40px',height:'40px',marginLeft:'-20px',marginTop:'-20px',borderRadius:'50%',border:'2px solid '+(cfg.ripple||'#5E7D45'),zIndex:2147483646,pointerEvents:'none',opacity:'0'});
    document.body.append(rip,cur);
    const S={pos:{},done:{},rip:null,sc:{}}, A=new WeakMap();
    const E=p=>p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;
    const at=n=>S.pos[n]||(S.pos[n]=cfg.P[n]());
    /* The page's own animations are paused and stepped to each frame's video time, so they play at
       their real speed however long a snapshot takes. */
    const drive=t=>{for(const a of document.getAnimations()){ if(!A.has(a)){A.set(a,t);a.pause();} const el=(t-A.get(a))*1000, end=a.effect?a.effect.getComputedTiming().endTime:0; if(isFinite(end)&&el>=end) a.finish(); else a.currentTime=el; }};
    window.__frame=function(t){ try {
      (cfg.SCROLLS||[]).forEach((s,i)=>{ if(t<s[0]) return; if(!S.sc[i]) S.sc[i]=[scrollY,s[2]()]; const q=E(Math.min(1,(t-s[0])/(s[1]-s[0]))); window.scrollTo(0,S.sc[i][0]+(S.sc[i][1]-S.sc[i][0])*q); });
      const done=cfg.MOVES.filter(m=>t>=m[0]); let p;
      if(!done.length) p=at(cfg.MOVES[0][2]);
      else{const m=done[done.length-1],a=at(m[2]),b=at(m[3]),q=E(Math.min(1,(t-m[0])/(m[1]-m[0])));p=[a[0]+(b[0]-a[0])*q,a[1]+(b[1]-a[1])*q];}
      cur.style.transform='translate('+(p[0]-2)+'px,'+(p[1]-2)+'px)';
      cfg.CLICKS.forEach((c,i)=>{ if(t>=c[0]&&!S.done[i]){S.done[i]=1; if(c[1]) c[1](); S.rip=[p[0],p[1],c[0]];} });   // a null action is a press: the ring, no click
      if(S.rip){const d=(t-S.rip[2])/0.45; if(d<=1){rip.style.left=S.rip[0]+'px';rip.style.top=S.rip[1]+'px';rip.style.opacity=String(0.9*(1-d));rip.style.transform='scale('+(0.35+d*0.9)+')';} else rip.style.opacity='0';}
      if(cfg.onFrame) cfg.onFrame(t);
      drive(t);
      return 1;
    } catch(e) { return 'timeline error at t='+t+': '+e.message; } };
    return 1;
  };
  return 1;
})();
"""#

@MainActor final class Recorder: NSObject, WKNavigationDelegate {
    var web: WKWebView!, window: NSWindow!
    var loaded: CheckedContinuation<Void, Never>?

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { loaded?.resume(); loaded = nil }

    @discardableResult func js(_ s: String) async -> Any? {
        return try? await web.evaluateJavaScript(s)
    }
    func snapshot() async -> CGImage? {
        let c = WKSnapshotConfiguration(); c.afterScreenUpdates = true
        return await withCheckedContinuation { k in
            web.takeSnapshot(with: c) { img, _ in k.resume(returning: img?.cgImage(forProposedRect: nil, context: nil, hints: nil)) }
        }
    }
    func pause(_ ms: UInt64) async { try? await Task.sleep(nanoseconds: ms * 1_000_000) }

    func draw(_ img: CGImage, over first: CGImage?, alpha: CGFloat, into ctx: CGContext) {
        ctx.interpolationQuality = .high
        let r = CGRect(x: 0, y: 0, width: OW, height: OH)
        ctx.draw(img, in: r)
        if let f = first, alpha > 0 { ctx.setAlpha(alpha); ctx.draw(f, in: r); ctx.setAlpha(1) }
    }
    func writePNG(_ img: CGImage, _ path: String) {
        guard let d = CGImageDestinationCreateWithURL(URL(fileURLWithPath: path) as CFURL, "public.png" as CFString, 1, nil) else { return }
        CGImageDestinationAddImage(d, img, nil); CGImageDestinationFinalize(d)
    }
    func writeJPEG(_ img: CGImage, _ path: String) {
        let cs = CGColorSpace(name: CGColorSpace.sRGB)!
        guard let ctx = CGContext(data: nil, width: OW, height: OH, bitsPerComponent: 8, bytesPerRow: 0, space: cs, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue) else { return }
        draw(img, over: nil, alpha: 0, into: ctx)
        guard let scaled = ctx.makeImage(), let d = CGImageDestinationCreateWithURL(URL(fileURLWithPath: path) as CFURL, "public.jpeg" as CFString, 1, nil) else { return }
        CGImageDestinationAddImage(d, scaled, [kCGImageDestinationLossyCompressionQuality: 0.84] as CFDictionary); CGImageDestinationFinalize(d)
    }

    func run() async {
        let cfg = WKWebViewConfiguration()
        cfg.websiteDataStore = .nonPersistent()
        if #available(macOS 14.0, *) { cfg.preferences.inactiveSchedulingPolicy = .none }
        web = WKWebView(frame: NSRect(x: 0, y: 0, width: VW, height: VH), configuration: cfg)
        web.appearance = NSAppearance(named: DARK ? .darkAqua : .aqua)
        web.pageZoom = ZOOM
        web.navigationDelegate = self
        window = NSWindow(contentRect: NSRect(x: -6000, y: -6000, width: VW, height: VH), styleMask: [.borderless], backing: .buffered, defer: false)
        window.contentView = web
        window.orderFrontRegardless()

        await withCheckedContinuation { (k: CheckedContinuation<Void, Never>) in loaded = k; web.load(URLRequest(url: URL(string: URLSTR)!)) }
        await pause(900)
        guard let scene = try? String(contentsOfFile: SCENE, encoding: .utf8) else { FileHandle.standardError.write("cannot read \(SCENE)\n".data(using: .utf8)!); exit(1) }
        await js(ENGINE)
        let made = await js("window.__cfg=(function(LANG,H){\n" + scene + "\n})(\"\(LANG)\", window.__H); window.__cfg ? 1 : 'scene returned nothing'")
        if let e = made as? String { FileHandle.standardError.write((e + "\n").data(using: .utf8)!); exit(4) }
        await js("window.__cfg.setup && window.__cfg.setup(); 1")
        await pause(700)
        await js("window.scrollTo(0,0); window.__engine(window.__cfg)")
        let DUR = (await js("window.__cfg.duration || 14") as? Double) ?? 14
        await pause(200)

        let url = URL(fileURLWithPath: OUT + ".mp4"); try? FileManager.default.removeItem(at: url)
        let writer = try! AVAssetWriter(outputURL: url, fileType: .mp4)
        let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
            AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: OW, AVVideoHeightKey: OH,
            AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 1_700_000, AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel, AVVideoMaxKeyFrameIntervalKey: 120]])
        let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB, kCVPixelBufferWidthKey as String: OW, kCVPixelBufferHeightKey as String: OH])
        writer.add(input); writer.startWriting(); writer.startSession(atSourceTime: .zero)

        let total = Int(DUR * Double(FPS)), fadeFrames = Int(FADE * Double(FPS))
        var first: CGImage? = nil
        for i in 0..<total {
            let t = Double(i) / Double(FPS)
            let r = await js("window.__frame(\(t))")
            if let e = r as? String { FileHandle.standardError.write((e + "\n").data(using: .utf8)!); exit(4) }   // a broken take stops here, never ships
            await pause(10)
            guard let img = await snapshot() else { FileHandle.standardError.write("snapshot failed at \(i)\n".data(using: .utf8)!); exit(2) }
            if i == 0 { first = img; writeJPEG(img, OUT + ".jpg") }
            if debugFrames.contains(i) { writePNG(img, OUT + "-f\(i).png") }
            var pb: CVPixelBuffer?
            CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &pb)
            guard let buf = pb else { exit(3) }
            CVPixelBufferLockBaseAddress(buf, [])
            let ctx = CGContext(data: CVPixelBufferGetBaseAddress(buf), width: OW, height: OH, bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(buf),
                                space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue)!
            let into = i - (total - fadeFrames)
            draw(img, over: first, alpha: into > 0 ? CGFloat(into) / CGFloat(fadeFrames) : 0, into: ctx)
            CVPixelBufferUnlockBaseAddress(buf, [])
            while !input.isReadyForMoreMediaData { await pause(2) }
            adaptor.append(buf, withPresentationTime: CMTime(value: Int64(i), timescale: FPS))
        }
        input.markAsFinished()
        await writer.finishWriting()
        let size = (try? FileManager.default.attributesOfItem(atPath: url.path)[.size] as? Int) ?? 0
        print("\(url.lastPathComponent): \(total) frames, \(size / 1024) KB")
    }
}

let app = NSApplication.shared
app.setActivationPolicy(.prohibited)
Task { @MainActor in let recorder = Recorder(); await recorder.run(); exit(0) }
app.run()
