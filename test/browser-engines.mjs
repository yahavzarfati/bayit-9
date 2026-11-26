export async function runBrowserEngines(cases, exercise) {
  const failures = [];
  for (const [engine, ...options] of cases) {
    const name = engine.name();
    try {
      await exercise(engine, ...options);
      console.log('PASS browser engine: ' + name);
    } catch (cause) {
      failures.push(new Error('FAIL browser engine: ' + name, { cause }));
    }
  }
  if (failures.length) throw new AggregateError(failures, 'Browser engine checks failed');
}
