import fs from 'fs'

import * as mupdf from 'mupdf'
import { createWorker } from 'tesseract.js'

async function imageToOCR(filePath: string) {
  const worker = await createWorker('eng', 1, {
    logger: (m) => console.log(m),
  })
  const {
    data: { text },
  } = await worker.recognize(filePath)
  console.log(text.replaceAll('[', '|').replaceAll(']', '|'))
  await worker.terminate()
}

async function readPDF(filePath: string) {
  const doc = mupdf.Document.openDocument(filePath)
  for (let i = 0; i < doc.countPages(); ++i) {
    const page = doc.loadPage(i)
    const text = page.toStructuredText().asText()
    console.log(text)
  }
}

async function pdfToImage(filePath: string) {
  const doc = mupdf.Document.openDocument(filePath)

  const dpi = 600
  const scale = dpi / 72

  for (let i = 0; i < doc.countPages(); ++i) {
    const page = doc.loadPage(i)
    const pixmap = page.toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceRGB)

    const buffer = pixmap.asPNG()
    fs.writeFileSync(`src/files/output/png/page${i + 1}.png`, buffer)
  }
}

function main() {
  const filePath = 'src/files/input/input-1.pdf'
  // readPDF(filePath)
  // pdfToImage(filePath)
  imageToOCR('src/files/output/png/page1.png')
}

main()
