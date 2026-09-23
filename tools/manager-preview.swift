// The Manager preview on the Nokime site: the real tool, filmed. Loads Manager in an off-screen
// WKWebView (light, as the tool looks by default; example dishes, no stored data), plays a scripted timeline — a cursor opens a
// dish, opens its sheet, steps the price down until the plate falls under its floor, cancels,
// then shows Exploitation — snapshots every frame and writes an H.264 MP4 and a JPEG poster with
// AVFoundation (there is no ffmpeg on this machine). Manager must be served first:
//
//   python3 -m http.server 8645 --directory ~/Projets/nokime-manager &
//   swiftc -O tools/manager-preview.swift -o /tmp/manager-preview
//   /tmp/manager-preview http://localhost:8645/ fr media/manager-preview-fr
//   /tmp/manager-preview http://localhost:8645/ en media/manager-preview-en
//   (a fourth argument, dark, films the tool's dark theme instead)
//
// FRAMES=30,90,200 writes those frames as PNGs next to the output, to check the timeline.
import AVFoundation
import Cocoa
import WebKit

let args = CommandLine.arguments
guard args.count >= 4 else { FileHandle.standardError.write("usage: manager-preview <url> <fr|en> <out-prefix>\n".data(using: .utf8)!); exit(1) }
let URLSTR = args[1], LANG = args[2], OUT = args[3]
let DARK = args.count > 4 && args[4] == "dark"
let VW: CGFloat = 1280, VH: CGFloat = 900, ZOOM: CGFloat = 0.88
let OW = 1280, OH = 900, FPS: Int32 = 60, DUR = 14.0, FADE = 0.5
let debugFrames = Set((ProcessInfo.processInfo.environment["FRAMES"] ?? "").split(separator: ",").compactMap { Int($0) })

let TIMELINE = #"""
(function(){
  const cur=document.createElement('div');
  cur.innerHTML='<svg width="22" height="28" viewBox="0 0 22 28"><path d="M2 2v21l5.2-5 3.6 8.2 3.4-1.5-3.6-8H18z" fill="CURSOR_FILL" stroke="CURSOR_LINE" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  Object.assign(cur.style,{position:'fixed',left:'0',top:'0',zIndex:2147483647,pointerEvents:'none'});
  const rip=document.createElement('div');
  Object.assign(rip.style,{position:'fixed',width:'40px',height:'40px',marginLeft:'-20px',marginTop:'-20px',borderRadius:'50%',border:'2px solid RIPPLE',zIndex:2147483646,pointerEvents:'none',opacity:'0'});
  document.body.append(rip,cur);
  const S={pos:{},done:{},rip:null};
  const $=s=>document.querySelector(s);
  const dish=()=>[...document.querySelectorAll('.dish')].find(d=>/30[.,]91/.test(d.textContent));   // the sea bass, whatever the language's sort order
  const ctr=el=>{const r=el.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]};
  const btn=(root,re)=>[...root.querySelectorAll('button')].find(b=>re.test(b.textContent));
  const at=(n)=>S.pos[n]||(S.pos[n]=P[n]());
  const E=p=>p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;
  const P={
    start:()=>[innerWidth*0.84,innerHeight*0.86],
    row:()=>{const r=dish().querySelector('.head').getBoundingClientRect();return [r.left+Math.min(250,r.width*0.22),r.top+r.height/2]},
    edit:()=>ctr(btn(dish(),/Modifier|Edit/)),
    price:()=>{const r=$('#d_price').getBoundingClientRect();return [r.left+r.width*0.3,r.bottom+16]},
    cancel:()=>ctr(btn($('.modal'),/Annuler|Cancel/)),
    tab:()=>{const r=$('[data-view=exploitation]').getBoundingClientRect();return [r.left+r.width*0.45,r.bottom+14]},
  };
  const MOVES=[[0.6,2.3,'start','row'],[3.5,4.6,'row','edit'],[5.7,6.5,'edit','price'],[10.0,10.9,'price','cancel'],[11.5,12.3,'cancel','tab']];
  const CLICKS=[[2.5,'row',()=>dish().querySelector('.head').click()],
                [4.8,'edit',()=>btn(dish(),/Modifier|Edit/).click()],
                [6.7,'price',()=>{const i=$('#d_price');i.focus();i.select();}],
                [11.1,'cancel',()=>btn($('.modal'),/Annuler|Cancel/).click()],
                [12.5,'tab',()=>$('[data-view=exploitation]').click()]];
  /* Manager rebuilds the bar on every input, so the marker moves only when the price does: the price
     counts down 0.10 € a frame (34 → 19 in 2.5 s at 60 fps), and the marker glides with it. */
  const PRICES=[]; for(let c=340; c>=190; c--) PRICES.push((c/10).toString());
  /* The page's own animations (the sheet sliding in, the marker moving) are paused and stepped to the video
     time of each frame, so they play at their real speed however long a snapshot takes. */
  const A=new WeakMap();
  const drive=t=>{for(const a of document.getAnimations()){ if(!A.has(a)){A.set(a,t);a.pause();} const el=(t-A.get(a))*1000, end=a.effect?a.effect.getComputedTiming().endTime:0; if(isFinite(end)&&el>=end) a.finish(); else a.currentTime=el; }};
  window.__frame=function(t){ try {
    const done=MOVES.filter(m=>t>=m[0]);
    let p;
    if(!done.length) p=at('start');
    else{const m=done[done.length-1],a=at(m[2]),b=at(m[3]),q=E(Math.min(1,(t-m[0])/(m[1]-m[0])));p=[a[0]+(b[0]-a[0])*q,a[1]+(b[1]-a[1])*q];}
    cur.style.transform='translate('+(p[0]-2)+'px,'+(p[1]-2)+'px)';
    for(const c of CLICKS){ if(t>=c[0]&&!S.done[c[1]]){S.done[c[1]]=1;c[2]();S.rip=[p[0],p[1],c[0]];} }
    if(S.rip){const d=(t-S.rip[2])/0.45; if(d<=1){rip.style.left=S.rip[0]+'px';rip.style.top=S.rip[1]+'px';rip.style.opacity=String(0.9*(1-d));rip.style.transform='scale('+(0.35+d*0.9)+')';} else rip.style.opacity='0';}
    if(t>=7.0&&t<9.6){const i=Math.min(PRICES.length-1,Math.floor((t-7.0)/(2.5/PRICES.length)));const inp=$('#d_price');if(inp&&inp.value!==PRICES[i]){inp.value=PRICES[i];inp.dispatchEvent(new Event('input',{bubbles:true}));}}
    drive(t);
    return 1;
  } catch(e) { return 'timeline error at t='+t+': '+e.message; } };
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
        if LANG == "en" { await js("document.getElementById('langBtn').click(); 1"); await pause(300) }
        await js("window.scrollTo(0,0); 1")
        await js(TIMELINE.replacingOccurrences(of: "CURSOR_FILL", with: DARK ? "#F1F0EA" : "#1B1E17")
                         .replacingOccurrences(of: "CURSOR_LINE", with: DARK ? "#15170F" : "#FFFFFF")
                         .replacingOccurrences(of: "RIPPLE", with: DARK ? "#BBEB8A" : "#5E7D45"))
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
