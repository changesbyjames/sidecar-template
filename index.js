// @ts-check

const path = require('path')
const { name, version } = require('./package.json')

/** @type {import('caz').Template} */
module.exports = {
  name,
  version,
  metadata: {
    // TODO: predefined template metadata
    year: new Date().getFullYear()
  },
  prompts: [
    // TODO: custom template prompts
    {
      name: 'name',
      type: 'text',
      message: 'Project name'
    },
    {
      name: 'version',
      type: 'text',
      message: 'Project version'
    },
    {
      name: 'description',
      type: 'text',
      message: 'Project description',
      initial: 'Awesome sidecar apps.'
    },
    {
      name: 'author',
      type: 'text',
      message: 'Project author name'
    },
    {
      name: 'email',
      type: 'text',
      message: 'Project author email'
    },
    {
      name: 'url',
      type: 'text',
      message: 'Project author url'
    },
    {
      name: 'github',
      type: 'text',
      message: 'GitHub username or organization',
      initial: 'zce'
    },
    {
      name: 'features',
      type: 'multiselect',
      message: 'Choose the features you need',
      instructions: false,
      choices: [
        // TODO: custom template features
        { title: 'Automatic test', value: 'test', selected: true },
        { title: 'Foo', value: 'foo' }
      ]
    },
    {
      name: 'install',
      type: 'confirm',
      message: 'Install dependencies',
      initial: true
    },
    {
      name: 'pm',
      type: prev => process.env.NODE_ENV === 'test' || prev ? 'select' : null,
      message: 'Package manager',
      hint: ' ',
      choices: [
        { title: 'npm', value: 'npm' },
        { title: 'pnpm', value: 'pnpm' },
        { title: 'yarn', value: 'yarn' }
      ]
    }
  ],
  complete: async ctx => {
    // TODO: custom complete callback
    console.clear()
    console.log(`Created a new project in ${ctx.project} by the ${ctx.template} template.\n`)
    console.log('Getting Started:')
    if (ctx.dest !== process.cwd()) {
      console.log(`  $ cd ${path.relative(process.cwd(), ctx.dest)}`)
    }
    if (ctx.config.install === false) {
      console.log(`  $ npm install`)
    }
    console.log(`  $ ${ctx.config.install ? ctx.config.install : 'npm'} test`)
    console.log('\nHappy hacking :)\n')
  }
}
