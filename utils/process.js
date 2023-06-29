const { spawn } = require('child_process');

exports.run = (command, cwd = process.cwd()) => {
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

// A function that goes through an array of files, checks if there is Es6 template string in the contents and if so, replaces it with $[[variableName]] syntax.
/** @param {Array<{ contents: Buffer }>} files */
exports.replaceTemplateStrings = files => {
  return files.map(file => {
    const content = file.contents.toString();
    if (content.includes('${')) {
      // Replace all instances of ${something} with $%{something}%
      file.contents = Buffer.from(content.replace(/\${(.*?)}/g, '$%{$1}%'));
    }
    return file;
  });
};

/** @param {Array<{ contents: Buffer }>} files */
exports.restoreTemplateStrings = files => {
  return files.map(file => {
    const content = file.contents.toString();
    if (content.includes('$[[')) {
      // Replace all instances of $%{something}% with  ${something}
      file.contents = Buffer.from(content.replace(/\$%{(.*?)}%/g, '${$1}'));
    }
    return file;
  });
};
