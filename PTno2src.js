/* note: intended to be ran in nodejs */
/* doesnt have any input support yet unfortunately */
/* below for debuggin purposes */
Array.prototype.toString = function() {return `[${this.join(`, `)}]`; }
function PTno2Struct(type, arr) {
    this.PTtype = type; this.data = arr; this.toString = () => `[PT ${type} ${arr}]`}
const vars = {};
const theOtherSplit = (ostr, splitter, openDelim, closeDelim, strDelim, nesting = true, dontNestChars = []) => {
    /* note: handles backslashes and nesting (set nesting true to handle nesting) */
    const str = ostr + (ostr[ostr.length - 1] === splitter ? `` : splitter);
    let result = [], accum = ``, inD = 0, inStr = false;
    for(let i=0; i<str.length; i++) {
        const ch = str[i], isBSed = str[i - 1] === `\\` && str[i - 2] !== `\\`;
        if(!isBSed) {
                 if(openDelim.includes(ch)) inD = nesting && !(dontNestChars.map(a => a[0]).includes(ch)) ? inD+1 : true;
                 if(closeDelim.includes(ch)) inD = nesting && !(dontNestChars.map(a => a[1]).includes(ch)) ? inD-1 : false;
                 if(ch === strDelim) inStr = !inStr;
             if(splitter === ch && !inD && !inStr) {result.push(accum); accum = ``; continue;}
             accum += ch;}}
    return result;};

const PTno2__arr = ptno2 => theOtherSplit(ptno2.trim(), `\n`, [`(`, `[`, `{`], [`)`, `]`, `}`], `"`)
    .map(s => theOtherSplit(s.trim(), ` `, [`(`, `[`, `{`], [`)`, `]`, `}`], `"`));

const convStr = ostr => {
    if(Array.isArray(ostr)) return ostr.map(convStr);
    const str = ostr.trim();
    const sub = str.substring(1, str.length - 1);
    if(str.startsWith(`"`) && str.endsWith(`"`)) return sub;
    if(!(Number.isNaN(+str))) return +str;
    if(str.startsWith(`b`) && str !== `b` && !(Number.isNaN(+(str.substring(1, str.length))))) return BigInt(str.substring(1, str.length));
    if(str === `nl`) return null;
    if(str.startsWith(`'(`)) return [new PTno2Struct(`id`, `qte`), convStr(str.substring(1, str.length))];
    if(str.startsWith(`(`) && str.endsWith(`)`)) return PTno2__arr(sub)[0].map(convStr);
    if(str.startsWith(`[`) && str.endsWith(`]`)) return new PTno2Struct(`li`, PTno2__arr(sub)[0].map(convStr));
    if(str.startsWith(`{`) && str.endsWith(`}`)) return new PTno2Struct(`blockium`, PTno2__arr(sub).map(convStr));
    return new PTno2Struct(`id`, str);};
const toCA = str => convStr(PTno2__arr(str));
const evl = (codeArr, varsScope = vars) => {
    codeArr.forEach(osubcode => {
        const subcode = osubcode.map(i => Array.isArray(i) ? evl(i) : i);
        const [cmd, ...args] = subcode;
        const cmdStr = cmd.data;
        if(cmdStr === `var`) varsScope[args[0].data] = args[1];
        if(cmdStr === `cnt`) varsScope[`!${args[0].data}`] = args[1];
        if(cmdStr === `out`) console.log(args[0]); });};


const evlStr = s => evl(toCA(s));
