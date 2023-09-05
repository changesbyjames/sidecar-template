const path = require('path');
const { writeFile } = require('fs/promises');
const { name, version } = require('./package.json');

const { run, replaceTemplateStrings, restoreTemplateStrings } = require('./utils/process');

const project = require('./prompts/project.js');
const api = require('./prompts/api.js');
const pulumi = require('./prompts/pulumi.js');
const drive = require('./prompts/drive.js');

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
    await Promise.all(ctx.files.map(async item => await writeFile(path.join(ctx.dest, item.path), item.contents)));
  },

  filters: {
    /** @param {{ api: boolean }} flags */
    'api/**/*': flags => flags.api,
    /** @param {{ components: string[] }} flags */
    'api/src/routes/authentication-router.ts': flags => flags.components?.includes('auth')
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
    console.log(`  $ npm run pulumi:init`);
    console.log(`  $ npm run pulumi up`);
  }
};
