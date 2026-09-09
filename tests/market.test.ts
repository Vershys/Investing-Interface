import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSymbol,brokerUrl} from '../lib/market.ts';
test('normalize known and exchange-qualified symbols',()=>{assert.equal(normalizeSymbol(' aapl '),'NASDAQ:AAPL');assert.equal(normalizeSymbol('nyse:lumn'),'NYSE:LUMN');assert.equal(normalizeSymbol('IBM'),'IBM');});
test('reject script, URL and non-US exchange input',()=>{for(const input of ['<script>','https://a.com','NASDAQ:AAPL?x=1','BINANCE:BTCUSDT','AAPL/BTC',''])assert.equal(normalizeSymbol(input),null);});
test('broker link identifies selected stock and contains no order parameters',()=>{assert.equal(brokerUrl('NYSE:LUMN'),'https://robinhood.com/us/en/stocks/LUMN/');assert.throws(()=>brokerUrl('javascript:alert(1)'));});
