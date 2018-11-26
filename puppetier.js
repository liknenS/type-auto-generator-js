
let types = []


// before run test session
 const client = await page.target().createCDPSession()
  await client.send('Runtime.enable')
  await client.send('Profiler.enable')
  await client.send('Profiler.startTypeProfile')


// after run test session
let { result, ...restData } = await client.send('Profiler.takeTypeProfile')
  types.push(result.find(a => a.url === 'http://localhost:8000/app-e111f37b0e83d3f42b53.js'))
  