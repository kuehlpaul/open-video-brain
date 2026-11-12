// Face detection (macOS Vision) for `npm run faces`: one line per image, "<file> <cx> <cy> <h>" (fractions, y from the top).
// The largest face wins; without a face: "<file> none".
import AppKit
import Vision

for p in CommandLine.arguments.dropFirst() {
  guard let img = NSImage(contentsOfFile: p), let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    print("\(p) none")
    continue
  }
  let req = VNDetectFaceRectanglesRequest()
  try? VNImageRequestHandler(cgImage: cg).perform([req])
  let faces = (req.results ?? []).sorted { $0.boundingBox.width > $1.boundingBox.width }
  if let b = faces.first?.boundingBox {
    print(String(format: "%@ %.4f %.4f %.4f", p, b.midX, 1 - b.midY, b.height))
  } else {
    print("\(p) none")
  }
}
