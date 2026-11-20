/* note: intended to be ran in nodejs */
/* doesnt have any input support yet unfortunately */
/* below for debuggin purposes */
const OE = (o1, o2) => Object.entries(o1).filter(([k, v]) => k !== `toString`).every(([key, val]) => typeof val === `object` ? OE(val, o2?.[key]) : val === o2?.[key]);
Array.prototype.toString = function() {return `[${this.join(`, `)}]`; }
const recurArrReplace = (arr, from, to) => arr.map?.(i => Array.isArray(i) ? recurArrReplace(i, from, to) : (OE(i, from) ? to : i)) ?? arr;
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
    if(str === `#t`) return true;
    if(str === `#f`) return false;
    if(str.startsWith(`'`)) return [new PTno2Struct(`id`, `qte`), convStr(str.substring(1, str.length))];
    if(str.startsWith(`(`) && str.endsWith(`)`)) return PTno2__arr(sub).map(convStr);
    if(str.startsWith(`[`) && str.endsWith(`]`)) return new PTno2Struct(`li`, PTno2__arr(sub)[0].map(convStr));
    if(str.startsWith(`{`) && str.endsWith(`}`)) return new PTno2Struct(`blockium`, PTno2__arr(sub).map(convStr));
    return new PTno2Struct(`id`, str);};
const toCA = str => convStr(PTno2__arr(str));
const err = name => {throw new Error(name);};
const evl = (ocodeArr, ovarsScope = vars) => {
    const codeArr = ocodeArr?.PTtype ? ocodeArr.data : ocodeArr;
    const varsScope = {...ovarsScope};
    let toRtn;
    const autoqs = {var: [0], set: [0]};
    const aqfns = Object.keys(autoqs), aqais = Object.values(autoqs);
    const retrn = t => !toRtn && (toRtn = t);
    const varFromKey = k => varsScope?.[k];
    let err = e => {throw e;};
    codeArr.forEach(oosubcode => {
        let osubcode = oosubcode?.PTtype ? oosubcode.data : oosubcode;
        Object.entries(autoqs).forEach(([fname, arg]) => osubcode[0].data === fname && arg.forEach(a => {osubcode[a+1] = [new PTno2Struct(`id`, `qte`), osubcode[a+1]]; }));
        const subcode = osubcode.map((i, ind) => Array.isArray(i) ? (i[0].data === `qte` ? i[1] : evl(i, varsScope)) : i?.PTtype === `id` && ind !== 0 ? (varFromKey(i.data) ?? (err(`undefined variable`), undefined)) : i);
        const [cmd, ...args] = subcode;
        const cmdStr = cmd?.data;
        if(cmdStr?.prms !== undefined && cmdStr?.body) {
            let theBody = [...cmdStr.body.data];
            cmdStr.prms.data.forEach((it, ind) => { theBody = recurArrReplace(theBody, it, args[ind]);});
            evl(theBody);}
        if(cmdStr === `;`) retrn(evl(args));
        if(cmdStr === `var`) {
            if(varsScope[args[0].data]) retrn();
            retrn(varsScope[args[0].data] = args[1]);}
        if(cmdStr === `cnt`) {
            if(varsScope[args[0].data]) retrn();
            return (varsScope[`!${args[0].data}`] = args[1]);}
        if(cmdStr === `set` && Object.keys(varsScope).filter(v => !(v.startsWith(`!`))).includes(args[0].data)) retrn(varsScope[args[0].data] = args[1]);
        if(cmdStr === `out`) console.log(args[0]);
        if(cmdStr === `.`) retrn(new PTno2Struct(`lambda`, { prms: args[0], body: args[1]}));
        if(cmdStr === `+`) retrn(args.reduce((a, b) => a + b));
        if(cmdStr === `-`) retrn(args.reduce((a, b) => a - b));
        if(cmdStr === `*`) retrn(args.reduce((a, b) => a * b));
        if(cmdStr === `/`) retrn(args.reduce((a, b) => a / b));
        if(cmdStr === `if`) retrn(args[0] ? evl(args[1], varsScope) : evl(args[2], varsScope));
        retrn(varFromKey(cmdStr) ?? cmd);}); return toRtn;};

const evlStr = s => evl(toCA(s));
