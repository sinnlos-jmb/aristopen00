import assert from 'node:assert/strict';
import { indexarGrafo, crearEstadoFocal, obtenerSubgrafoFocal, alternarExpansion, cambiarFocos, restaurarBaseFocal } from '../js/lab/graphFocusExpansion.js';
const ns = ['a','b','c','shared','x','y','z','leaf','orphan'].map(id => ({group:'nodes',data:{id,label:id}}));
const edges = [
  ['1','a','shared'], ['2','b','shared'], ['3','c','x'],
  ['4','shared','y'], ['5','y','z'], ['6','x','leaf'], ['7','z','orphan'],
  ['8','leaf','shared'], // un ciclo: no debe producir expansión implícita
].map(([id,source,target]) => ({group:'edges',data:{id,source,target,relacion:'prueba'}}));
const index = indexarGrafo([...ns,...edges]);
let s = crearEstadoFocal(index, ['a','b','c']);
const base = obtenerSubgrafoFocal(s);
assert.deepEqual([...base.aristas].sort(), ['1','2','3']);
assert.deepEqual([...base.nodos].sort(), ['a','b','c','shared','x']);
assert.equal(base.estadisticas.vecinosCompartidos, 1);
assert.equal(base.elementos.find(e => e.data.id === 'shared').data.compartido, 1);
assert.strictEqual(alternarExpansion(s, 'a'),s,'ningún foco puede plegarse');
assert.strictEqual(alternarExpansion(s, 'y'),s,'no se expande un nodo invisible');
s = alternarExpansion(s,'shared');
assert.deepEqual([...obtenerSubgrafoFocal(s).aristas].sort(),['1','2','3','4','8']);
assert.ok(obtenerSubgrafoFocal(s).nodos.has('leaf'));
s = alternarExpansion(s,'y');
assert.ok(obtenerSubgrafoFocal(s).nodos.has('z'));
s = alternarExpansion(s,'shared');
assert.deepEqual([...obtenerSubgrafoFocal(s).aristas].sort(),['1','2','3']);
assert.equal(s.expandidos.size,0,'al plegar el padre, las expansiones hijas inaccesibles se olvidan');
s = alternarExpansion(s,'x');
assert.ok(obtenerSubgrafoFocal(s).nodos.has('leaf'));
s = alternarExpansion(s,'leaf');
assert.ok(obtenerSubgrafoFocal(s).nodos.has('shared'));
s = alternarExpansion(s,'shared');
assert.ok(obtenerSubgrafoFocal(s).nodos.has('y'));
s = alternarExpansion(s,'x');
assert.ok(obtenerSubgrafoFocal(s).nodos.has('y'),'el compartido conserva su expansión desde la base');
s = restaurarBaseFocal(s);
assert.deepEqual([...obtenerSubgrafoFocal(s).aristas].sort(),['1','2','3']);
s = cambiarFocos(s,['c','x','missing','c']);
assert.deepEqual(s.focos,['c','x']);
assert.deepEqual([...obtenerSubgrafoFocal(s).aristas].sort(),['3','6']);
assert.equal(s.expandidos.size,0);
console.log('OK: focos múltiples, aristas dirigidas, base fija, vecinos compartidos, expansión, repliegue y limpieza de descendientes.');
