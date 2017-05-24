const test = require('ava');
const mock = require('mock-require');
const cluster = require('cluster');
const http = require('http');
const path = require('path');
const sleep = time => new Promise(resolve => setTimeout(resolve, time));
const spawn = require('child_process').spawn;
const exec = require('child_process').exec;
const helper = require('think-helper');

const interval = 5000;


let masterProcess = null;
test.afterEach.always(() => {
  if (masterProcess) {
    masterProcess.kill();
  }
});

function executeProcess(fileName, options, callback) {
  let scriptPath = path.join(__dirname, 'script', fileName);
  masterProcess = spawn(`node`, [scriptPath, JSON.stringify(options)]);

  masterProcess.stdout.on('data', (buf) => {
    try{
      let json = JSON.parse(buf.toString('utf-8'));
      callback(json);
    }catch (e){
      callback({message:buf.toString('utf-8')});
    }
  });

  return masterProcess;
}

test.serial('normal case', async t => {
  try {
    let result = {};
    let options = {
      workers: 1
    };
    executeProcess('master.js', options, (output) => {
      Object.assign(result, output);
    });
    await sleep(10000);
    t.is(result.isForked, true);
    t.is(result.options.workers, 1);
  } catch (e) {
  }
});

test.serial('options.workers >= 2 && enableAgent is true', async t => {
  try {
    let result = {};
    let options = {
      workers: 2,
      reloadSignal: 'SIGUSR2',
      enableAgent: true
    };
    executeProcess('master.js', options, (output) => {
      Object.assign(result, output);
    });
    await sleep(interval);
    t.is(result.isForked, true);
    t.is(result.options.enableAgent, true);
  } catch (e) {
  }
});

test.serial('if options.workers < 2,enableAgent is false', async t => {
  try {
    let result = {};
    let options = {
      workers: 1,
      reloadSignal: 'SIGUSR2',
      enableAgent: true
    };
    executeProcess('master.js', options, (output) => {
      Object.assign(result, output);
    });
    await sleep(interval);
    t.is(result.isForked, true);
    // if workers < 2, set enableAgent false
    t.is(result.options.enableAgent, false);
  } catch (e) {
  }
});

test.serial('trigger SIGUSR2 signal', async t => {
  try {
    let result = {};
    let options = {
      reloadSignal: 'SIGUSR2',
    };
    let masterProcess = executeProcess('master.js', options, (output) => {
      Object.assign(result, output);
    });
    await sleep(interval);
    t.is(result.isForked, true);

    console.log(`master process id is ${masterProcess.pid}`);

    exec(`KILL -SIGUSR2 ${masterProcess.pid}`,(error, stdout, stderr)=>{
      console.log(`stdout: ${stdout}`);
      console.log(`stderr: ${stderr}`);
      if (error !== null) {
        console.log(`exec error: ${error}`);
      }
    });
    await sleep(interval);

  } catch (e) {
  }
});