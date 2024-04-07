const http = require("http")
const {execSync} = require("child_process")
const fs = require("fs")
const path = require("path")

// delete recursively
function deleteFolderRecursive(path) {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach(function (file) {
            const curPath = path + "/" + file;
            if (fs.statSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
}

const resolvePost = req =>
    new Promise(resolve => {
        let chunk = "";
        req.on("data", data => {
            chunk += data;
        });
        req.on("end", () => {
            resolve(JSON.parse(chunk));
        });
    });

http.createServer(async (req, res) => {
    console.log('receive request', req.url)

    if (req.method === "GET") {
        return res.end("Hello world!");
    }
    if (req.method === 'POST' && req.url === '/') {
        const data = await resolvePost(req);
        const projectDir = path.resolve(`./${data.repository.name}`)
        deleteFolderRecursive(projectDir)

        console.log('clone repository...')
        execSync(`git clone https://github.com/yeyan1996/${data.repository.name}.git ${projectDir}`, {
            stdio: 'inherit',
        })
        console.log('repository cloned ✅')

        console.log('copy dockerfile...')
        fs.copyFileSync(path.resolve(`./Dockerfile`), path.resolve(projectDir, './Dockerfile'))

        console.log('copy .dockerignore...')
        fs.copyFileSync(path.resolve(__dirname, `./.dockerignore`), path.resolve(projectDir, './.dockerignore'))

        console.log('create docker image...')
        execSync(`sudo docker build . -t ${data.repository.name}-image:latest `, {
            stdio: 'inherit',
            cwd: projectDir
        })

        console.log('recreate docker container...')
        execSync(`sudo docker ps -a -f "name=^${data.repository.name}-container" --format="{{.Names}}" | xargs -r sudu docker stop | xargs -r sudu docker rm`, {
            stdio: 'inherit',
        })
        execSync(`sudo docker run -d -p 8888:80 --name ${data.repository.name}-container  ${data.repository.name}-image:latest`, {
            stdio: 'inherit',
        })
        console.log('deploy success ✅')
        res.end('ok')
    }
}).listen(3000, () => {
    console.log('server is ready')
})
