import test from 'node:test';
import assert from 'node:assert/strict';
import { eligibleReference, selectFactoryReferences, CatalogAccessDenied } from '../scripts/factory-reference-policy.mjs';

function fixture() {
  const fullName = 'trusted/mcp-tool';
  return {
    schemaVersion: 1, generatedAt: '2026-10-21T00:00:00Z', indexedCount: 1,
    tools: [{
      id:'trusted-mcp-tool',name:'MCP Tool',fullName,description:'MCP reference tool',
      category:'mcp',source:`https://github.com/${fullName}`,
      license:{code:'MIT',source:`https://api.github.com/repos/${fullName}/license`},
      github:{visibility:'PUBLIC',archived:false,fork:false,topics:['mcp','agent']},
      status:'indexed',observedAt:'2026-10-21T00:00:00Z',
      evidence:{githubApi:`https://api.github.com/repos/${fullName}`,executedTest:false,licenseFromGitHubMetadata:true},
      integration:{mode:'reference',tested:false,installRecipe:null}
    }]
  };
}
const request = {action:'discover',branch:'ai',query:'MCP',limit:10};
const context = {
  authenticated:true,role:'delegated-agent',branches:['ai'],
  permissions:['catalog:discover','catalog:category:mcp']
};

test('authorized factory discovery only returns inert metadata references with provenance',()=>{
  const out=selectFactoryReferences(fixture(),request,context);
  assert.equal(out.references.length,1);
  const x=out.references[0];
  assert.equal(x.permissionDecision,'reference-only');
  assert.equal(x.executable,false);
  assert.equal(x.installed,false);
  assert.equal(x.tested,false);
  assert.equal(x.published,false);
  assert.match(x.evidence.metadataSha256,/^[a-f0-9]{64}$/);
  assert.equal(out.upstreamCodeExecuted,false);
  assert.equal(out.integrationExecuted,false);
});

test('untrusted principals and forbidden actions cannot authorize tools',()=>{
  for(const altered of [
    null,{...context,authenticated:false},{...context,role:'anonymous'},
    {...context,permissions:['catalog:category:mcp']},
    {...context,branches:['food']},{...context,permissions:['catalog:discover']}
  ]) {
    assert.throws(()=>selectFactoryReferences(fixture(),request,altered),CatalogAccessDenied);
  }
  for(const action of ['execute','install','publish','shell','run','vendor']) {
    assert.throws(()=>selectFactoryReferences(fixture(),{...request,action},context),CatalogAccessDenied);
  }
  assert.throws(()=>selectFactoryReferences(fixture(),{...request,extra:'unauthorized'},context),CatalogAccessDenied);
  assert.throws(()=>selectFactoryReferences(fixture(),{...request,limit:99999},context),CatalogAccessDenied);
});

test('source-available or ambiguous and misattributed repositories never become tool references',()=>{
  const base=fixture();
  const variants=[
    {license:{...base.tools[0].license,code:'NOASSERTION'}},
    {license:{...base.tools[0].license,code:'LicenseRef-custom'}},
    {github:{...base.tools[0].github,visibility:'PRIVATE'}},
    {github:{...base.tools[0].github,fork:true}},
    {github:{...base.tools[0].github,archived:true}},
    {integration:{mode:'installed',tested:true,installRecipe:'curl upstream | sh'}},
    {evidence:{...base.tools[0].evidence,executedTest:true}},
    {source:'https://evil.example/not-github'}
  ];
  for(const variant of variants){
    const entry={...base.tools[0],...variant};
    assert.equal(eligibleReference(entry),false);
    assert.equal(selectFactoryReferences({...base,tools:[entry]},request,context).matched,0);
  }
});

test('category-scoped policies cannot leak other categories and malformed counts fail closed',()=>{
  const catalog=fixture();
  const another=structuredClone(catalog.tools[0]);
  another.id='owner-dataset';
  another.fullName='owner/dataset';
  another.name='Dataset';
  another.category='data';
  another.source='https://github.com/owner/dataset';
  another.license.source='https://api.github.com/repos/owner/dataset/license';
  another.evidence.githubApi='https://api.github.com/repos/owner/dataset';
  catalog.tools.push(another);catalog.indexedCount++;
  const allowed=selectFactoryReferences(catalog,{...request,query:''},context);
  assert.deepEqual(allowed.references.map(x=>x.fullName),['trusted/mcp-tool']);
  assert.throws(()=>selectFactoryReferences({...catalog,indexedCount:1},{...request,query:''},context),CatalogAccessDenied);
});
