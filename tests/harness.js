// tests/harness.js — 驗收 harness。orchestrator 所有；peer 可以跑，但不編輯。
//
// 三個設計約束，每一個都是為了擋掉一種「假綠」：
//
// 1. **常數從設計文件抄寫，寫死在這裡，不從 content.js 讀。**
//    否則「改產品裡的數字讓行為測試通過」會安靜地成功。第一組檢查就是拿
//    產品的設定去對這些抄本——改了產品的數字，會在對照那一關就爆。
//
// 2. **三態：pass / fail / TODO。** 把「還沒做」和「做了但錯」混成同一種紅，
//    一整張 issue 可以在功能不存在的情況下被標記成完成。
//
// 3. **每一條「不存在」的主張，都要先證明現場非空。** 「按了牆壁什麼都沒
//    發生」在沒有牆可按的時候永遠通過。母體是空的儀器會回報一個充滿自信的零。

export const R = { pass: [], fail: [], todo: [] };
let group = '';

export function section(name){ group = name; }

export function check(name, fn){
  const label = group ? group + ' · ' + name : name;
  try {
    const r = fn();
    // 'TODO' 或 'TODO: 還缺什麼'。**帶得動訊息**：一句沒有說出「什麼還沒做」的
    // 「尚未實作」，只夠告訴你有一格是空的，不夠告訴你要去做什麼。
    if (r === 'TODO' || (typeof r === 'string' && r.slice(0, 5) === 'TODO:')){
      R.todo.push({ label, msg: r === 'TODO' ? '尚未實作' : r.slice(5).trim() });
      return;
    }
    if (r === true || r === undefined){ R.pass.push({ label }); return; }
    R.fail.push({ label, msg: String(r) });
  } catch (e){
    R.fail.push({ label, msg: (e && e.message) || String(e) });
  }
}

// 斷言小工具。訊息一律要帶「實際值」，不然紅了還要再跑一次才知道發生什麼。
export function eq(actual, expect, what){
  if (actual !== expect) return `${what}: 期望 ${JSON.stringify(expect)}，實際 ${JSON.stringify(actual)}`;
  return true;
}
export function near(actual, expect, tol, what){
  if (Math.abs(actual - expect) > tol)
    return `${what}: 期望 ${expect}±${tol}，實際 ${actual}`;
  return true;
}
export function ok(cond, msg){ return cond ? true : msg; }

// 母體非空：任何「必須沒有 X」的檢查都要先過這一關（見 skill §5.6）
export function nonEmpty(n, what){
  if (!(n > 0)) return `母體是空的，這條 guard 從來沒有試過：${what}`;
  return true;
}

export function summary(){
  return { pass: R.pass.length, fail: R.fail.length, todo: R.todo.length,
           failures: R.fail, todos: R.todo };
}
