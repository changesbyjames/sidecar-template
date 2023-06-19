// @ts-check

// Regex for no whitespace:
const OnlyAlphaNumeric = /^[a-zA-Z0-9]+$/;

/** @type {import('caz').Template['prompts']}} */
module.exports = [
  {
    name: 'name',
    type: 'text',
    message: 'Project name',
    validate: value => {
      if (value.length < 4 || value.length > 8 || !OnlyAlphaNumeric.test(value)) {
        return 'A project name is required. It must be a single string between 4-8 characters, and contain only letters and numbers.';
      }
      return true;
    }
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
  }
];
