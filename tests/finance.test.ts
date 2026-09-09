import {test} from 'node:test';
import assert from 'node:assert/strict';
import {holdings,CASH,portfolioValue,portfolioChange,dayContribution,series,ranges,scenarioValue} from '../lib/finance.ts';
test('account value reconciles to positions and cash',()=>assert.equal(portfolioValue,holdings.reduce((s,h)=>s+h.price*h.shares,CASH)));
test('daily contribution reconciles to prior-close account value',()=>{const prior=holdings.reduce((s,h)=>s+h.price/(1+h.change/100)*h.shares,CASH);assert.ok(Math.abs(portfolioValue-prior-portfolioChange)<1e-8);assert.ok(dayContribution(holdings[1])<0);});
test('every demo range ends at the selected valuation',()=>{for(const range of ranges){const s=series(100,range);assert.equal(s.at(-1)?.value,100);assert.ok(s.every(p=>Number.isFinite(p.value)&&p.value>0));}});
test('scenario debt, dilution and insolvency behave correctly',()=>{assert.equal(scenarioValue(3,6,12,1),6);assert.equal(scenarioValue(3,6,12,2),3);assert.equal(scenarioValue(3,6,20,1),0);assert.throws(()=>scenarioValue(3,6,12,0));});
