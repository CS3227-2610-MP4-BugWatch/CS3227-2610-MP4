import { readFile } from 'node:fs/promises'
import { summarizeExperiment } from './summarizeExperiment.ts'

try {
  if (process.argv.length !== 3) throw new Error('Usage: node workflow/evaluation/report-experiment.js <experiment.json>')
  const input = JSON.parse(await readFile(process.argv[2], 'utf8'))
  process.stdout.write(`${JSON.stringify(summarizeExperiment(input), null, 2)}\n`)
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : 'Experiment report failed.'}\n`)
  process.exitCode = 1
}
