/**
 * @param {string} key
 * @param {import('caz').Template['prompts']} prompts
 */
exports.optional = (key, prompts) =>
  prompts.map(prompt => {
    prompt.type = (_, answers) => (answers[key] ? prompt.type : null);
    return prompt;
  });
