const fetcha = await fetch("https://puddle.farm/api/characters");
const fetchb = await fetcha.json();
const result = [];
for (let i = 0; i < fetchb.length; i++) {
  result.push({ id: fetchb[i][0], name: fetchb[i][1] });
}
console.log(result);
