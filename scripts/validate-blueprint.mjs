import { readFile } from 'node:fs/promises'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const schemaPath = new URL('../schemas/blueprint.schema.json', import.meta.url)
const examplePath = new URL('../examples/commercial-lending.blueprint', import.meta.url)

const [schema, example] = await Promise.all(
  [schemaPath, examplePath].map(async (path) => JSON.parse(await readFile(path, 'utf8'))),
)

const validator = new Ajv2020({ allErrors: true, strict: true })
addFormats(validator)

if (!validator.validate(schema, example)) {
  console.error(validator.errorsText(validator.errors, { separator: '\n' }))
  process.exitCode = 1
} else {
  console.log('Blueprint schema and example validated')
}
