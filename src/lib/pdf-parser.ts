import fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

import { SingleBar, Presets } from 'cli-progress'
import * as mupdf from 'mupdf'
import { createWorker } from 'tesseract.js'

async function imageToOCR(filePath: string): Promise<string> {
  let worker: any = null

  try {
    worker = await createWorker('eng', 1, {
      //logger: (m) => console.log(m),
    })

    const {
      data: { text },
    } = await worker.recognize(filePath)

    const safeText = (text ?? '').toString().replaceAll('[', '|').replaceAll(']', '|')

    return safeText
  } catch (error) {
    console.error('Erro no OCR:', error)

    // Sempre retorna uma string, mesmo em caso de erro
    return ''
  } finally {
    if (worker) {
      try {
        await worker.terminate()
      } catch {
        // ignora falha ao terminar
      }
    }
  }
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

function countPngFiles(dirPath: string): number {
  const items = fs.readdirSync(dirPath)
  return items.filter((name) => name.toLowerCase().endsWith('.png')).length
}

function saveToTxt(lines: string[], outputPath: string) {
  const content = lines.join('\n') // junta tudo com quebra de linha
  fs.writeFileSync(outputPath, content, 'utf-8')
}

async function oCRToTXT(__imgFolderPath: string, __outputTXTPath: string) {
  const rawText: string[] = []
  const imgCount: number = countPngFiles(__imgFolderPath)

  const bar = new SingleBar(
    {
      format: 'OCR [{bar}] {percentage}% | {value}/{total} páginas',
    },
    Presets.shades_classic,
  )

  bar.start(imgCount, 0)

  for (let i = 0; i < imgCount; i++) {
    const imgPath = path.resolve(__imgFolderPath, `page${i + 1}.png`)

    const text = await imageToOCR(imgPath)
    rawText.push(text)

    bar.update(i + 1)
  }

  bar.stop()
  saveToTxt(rawText, __outputTXTPath)
}

async function main() {
  const __currentFilePath = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__currentFilePath)

  const __inputFilePath = path.resolve(__dirname, '..', 'files', 'input', 'input-1.pdf')
  const __imgFolderPath = path.resolve(__dirname, '..', 'files', 'output', 'img')
  const __outputTXTPath = path.resolve(__dirname, '..', 'files', 'output', 'txt', 'ouput.txt')

  oCRToTXT(__imgFolderPath, __outputTXTPath)
  // readPDF(__inputFilePath)
  // pdfToImage(__inputFilePath)
  //   const rawText: string[] = []
  //   const imgCount: number = countPngFiles(__imgFolderPath)
  //   for (let i = 0; i < imgCount; i++) {
  //     const __imgFilePath = path.resolve(
  //       __dirname,
  //       '..',
  //       'files',
  //       'output',
  //       'img',
  //       `page${i + 1}.png`,
  //     )
  //     const text: string = await imageToOCR(__imgFilePath)
  //     rawText.push(text)
  //   }
  //   saveToTxt(rawText, __outputTXTPath)
}

main()
