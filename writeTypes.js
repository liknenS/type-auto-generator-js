const fs = require('fs')
const _ = require('lodash')
const sourceMap = require('source-map')
const lineColumn = require('line-column')

const ROOT_PATH = '/Users/liknens/work/myPropject/'

const absPath = p => `${ROOT_PATH}${p}`
const smPath = absPath('dist/app-e111f37b0e83d3f42b53.js.map')
const typesPath = absPath('types.json')
const types = require(typesPath)
const rawSourceMapJsonData = JSON.parse(fs.readFileSync(smPath))
const appFile = fs.readFileSync(absPath('dist/app-e111f37b0e83d3f42b53.js')).toString()

const resFileColl = lineColumn(appFile)
const getLineColumnByOffset = (o) => {
  const a = resFileColl.fromIndex(o)
  return { line: a.line, column: a.col }
}

const groupByOffset = types => {
  const groppedMap = {}
  for (let t of types) {
    if (groppedMap[t.offset]) {
      groppedMap[t.offset].types.push(...t.types)
    } else {
      groppedMap[t.offset] = t
    }
  }
  return Object.values(groppedMap)
}

const typeAnnotation = types => `/*${Object.entries(_.groupBy(types, 'name')).map(([name, arr]) => `${name}: ${arr.length}`).join(', ')}*/`

function MarkUpCode (source, entries) {
  const fileCol = lineColumn(source)
  entries = entries
    .map(a => ({ ...a, originOffset: fileCol.toIndex(a.place) + 1 }))
    .sort((a, b) => b.originOffset - a.originOffset)

  for (let entry of entries) {
    source = source.slice(0, entry.originOffset) + typeAnnotation(entry.types) +
      source.slice(entry.originOffset)
  }
  return source
}

const writeComments = (t) => {
  const byFile = _.groupBy(t, a => a.place.source)
  for (let file in byFile) {
    try {
      const fPath = absPath(file.replace('webpack:///', ''))
      const fileData = fs.readFileSync(fPath).toString()
      const newFile = MarkUpCode(fileData, byFile[file])
      // console.log(byFile[file], fileData)
      fs.writeFileSync(fPath, newFile)
      console.log(newFile)
    } catch (e) {
      console.log(e)
    }
  }
}

const run = async () => {
  const consumer = await new sourceMap.SourceMapConsumer(rawSourceMapJsonData)
  // console.log(consumer.sources);
  const typesS = groupByOffset(_.flatMap(types, a => a.entries))
  typesS.sort((a, b) => a.offset - b.offset)
  typesS.pop()
  const typesPlaces = typesS.map(a => {
    const coords = getLineColumnByOffset(a.offset)
    const place = consumer.originalPositionFor(coords)
    return {
      ...a,
      coords,
      place,
    }
  }).filter(a => a.place.source && a.place.source.startsWith('webpack:///src'))
  // writeComments(typesPlaces)
  consumer.destroy()
  fs.writeFileSync('mappedTypes.json', JSON.stringify(typesPlaces, null, 2))
}

 // run() // prepare data

 // writeComments(require('./mappedTypes.json'))  // write type comments
