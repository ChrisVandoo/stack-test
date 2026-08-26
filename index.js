function greet(name = "World") {
  return `Hello, ${name}!`;
}

console.log(greet(process.argv[2]));
