export const publish = async (name, value) => {
  console.log(`##vso[task.setvariable variable=${name};isOutput=true]${value}`);
};
