import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {categoriesMatch} from '../src/lib/categories.ts';
const options=(path:string,key:string)=>[...readFileSync(new URL(path,import.meta.url),'utf8').matchAll(new RegExp(`\\{ ${key}: "([^"]+)", label: "([^"]+)"`,'g'))].map(match=>({id:match[1],label:match[2]}));
test('each event filter matches the category saved by the form with the same label',()=>{
  const form=options('../src/pages/organizador/EventoForm.tsx','value');
  const shared=options('../src/pages/Eventos.tsx','id').filter(filter=>form.some(option=>option.label===filter.label));
  assert.equal(shared.length,6);
  for(const filter of shared)assert.ok(categoriesMatch(filter.id,form.find(option=>option.label===filter.label)?.id),filter.label);
});
