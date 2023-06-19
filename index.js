const path = require('path');
const { writeFile } = require('fs/promises');
const { spawn } = require('child_process');
const { name, version } = require('./package.json');

const run = (command, cwd = process.cwd()) => {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(' ');

    const child = spawn(cmd, args, { stdio: 'inherit', shell: true, cwd });
    child.once('error', reject);
    child.once('exit', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code: ${code}`));
      }
    });
  });
};

const project = require('./prompts/project.js');
const api = require('./prompts/api.js');
const pulumi = require('./prompts/pulumi.js');
const drive = require('./prompts/drive.js');

// A function that goes through an array of files, checks if there is Es6 template string in the contents and if so, replaces it with $[[variableName]] syntax.
/** @param {Array<{ contents: Buffer }>} files */
const replaceTemplateStrings = files => {
  return files.map(file => {
    const content = file.contents.toString();
    if (content.includes('${')) {
      // Replace all instances of ${something} with $[[something]]
      file.contents = Buffer.from(content.replace(/\$\{(.+?)\}/g, '$[[$1]]'));
    }
    return file;
  });
};

const restoreTemplateStrings = files => {
  return files.map(file => {
    const content = file.contents.toString();
    if (content.includes('$[[')) {
      // Replace all instances of $[[something]] with  ${something}
      file.contents = Buffer.from(content.replace(/\$\[\[(.+?)\]\]/g, '${$1}'));
    }
    return file;
  });
};

/** @type {import('caz').Template} */
module.exports = {
  name,
  version,
  metadata: {
    // TODO: predefined template metadata
    year: new Date().getFullYear()
  },
  prompts: [...project, ...pulumi, ...drive, ...api],
  prepare: ctx => {
    ctx.files = replaceTemplateStrings(ctx.files);
  },
  emit: async ctx => {
    ctx.files = restoreTemplateStrings(ctx.files);
    await Promise.all(
      ctx.files.map(async item => {
        await writeFile(path.join(ctx.dest, item.path), item.contents);
      })
    );
  },

  filters: {
    /** @param {{ api: boolean }} a */
    'api/**/*': a => a.api,
    /** @param {{ components: string[] }} a */
    'api/src/routes/authentication-router.ts': a => a.components.includes('auth')
  },
  complete: async ctx => {
    console.clear();
    console.log(`[sidecar] Created a new project in ${ctx.project} by the ${ctx.template} template.\n`);
    console.log('[sidecar] Installing dependencies in api, app & infrastructure');
    await run(`npm run bootstrap`, ctx.dest);
    console.log('[sidecar] Formatting project with prettier');
    await run(`npm run format`, ctx.dest);

    console.log('\n');
    console.log('[sidecar] Get started:');
    if (ctx.dest !== process.cwd()) {
      console.log(`  $ cd ${path.relative(process.cwd(), ctx.dest)}`);
    }
    console.log('\n');
    console.log('[sidecar] Set up the Pulumi stack:');
    console.log(`  $ npm run pulumi stack init dev`);
    console.log(`  $ npm run pulumi up`);

    console.log('\n');
    console.log('Set up the pipeline: https://example.com');

    console.log('\n');
    console.log('Get started with developing: https://example.com');
  }
};
