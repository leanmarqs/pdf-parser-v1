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
    console.log(text)
    const safeText = (text ?? '')
      .toString()
      .replaceAll('[', '|')
      .replaceAll(']', '|')
      .replaceAll('IR/D|', '|R/D|')
      .replaceAll('Rubrical Nome Rubrica', 'Rubrical | Nome Rubrica')
      .replaceAll('| MAT ', '| MAI ')

    console.log(safeText)
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
  // Quebra cada item do array em sublinhas usando '\n'
  const exploded = lines.flatMap((line) => line.split('\n'))

  // Filtra somente as linhas desejadas
  const filtered = exploded.filter(
    (line) => /^[0-9]{5}/.test(line) || /^Rubrica/.test(line) || /^\*/.test(line),
  )

  const tables = formatTable(filtered)

  const content = tables.join('\n')
  console.log(content)
  fs.writeFileSync(outputPath, content, 'utf-8')
}

function formatTable(lines: string[], separator: string = '|') {
  const rows: string[][] = lines.map((line) => line.split(separator).map((col) => col.trim()))

  // Calcula tamanho máximo de cada coluna
  const colWidths: number[] = []
  rows.forEach((cols: string[]) => {
    cols.forEach((col: string, i: number) => {
      colWidths[i] = Math.max(colWidths[i] || 0, col.length)
    })
  })

  // Reconstrói a tabela com padding correto
  return rows.map((cols: string[]) =>
    cols.map((col: string, i: number) => col.padEnd(colWidths[i], ' ')).join(' | '),
  )
}

async function oCRToTXT(__imgFolderPath: string, __outputTXTPath: string) {
  const rawText: string[] = []
  // const imgCount: number = countPngFiles(__imgFolderPath)
  const imgCount: number = 1

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
}

main()
