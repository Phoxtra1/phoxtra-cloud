const fs = require('fs');

console.log('1. Patching scratch_15.js (Functions main layout loader)...');
let f15 = fs.readFileSync('./scratch_15.js', 'utf8');

const t15 = 'Promise.all([j.forProject(t.region,t.project).functions.listRuntimes(),j.forProject(t.region,t.project).vcs.listInstallations({queries:[A.limit(100)]}),k?j.forProject(t.region,t.project).functions.listSpecifications({type:`builds`}):Promise.resolve({specifications:[],total:0}),k?j.forProject(t.region,t.project).functions.listSpecifications({type:`runtimes`}):Promise.resolve({specifications:[],total:0})])';

const r15 = 'Promise.all([j.forProject(t.region,t.project).functions.listRuntimes().catch(()=>({runtimes:[],total:0})),j.forProject(t.region,t.project).vcs.listInstallations({queries:[A.limit(100)]}).catch(()=>({installations:[],total:0})),k?j.forProject(t.region,t.project).functions.listSpecifications({type:`builds`}).catch(()=>({specifications:[],total:0})):Promise.resolve({specifications:[],total:0}),k?j.forProject(t.region,t.project).functions.listSpecifications({type:`runtimes`}).catch(()=>({specifications:[],total:0})):Promise.resolve({specifications:[],total:0})])';

if (f15.includes(t15)) {
    f15 = f15.replace(t15, r15);
    fs.writeFileSync('./scratch_15.js', f15);
    console.log('SUCCESS: Patched scratch_15.js!');
} else {
    console.error('ERROR: t15 pattern not found in scratch_15.js!');
}

console.log('\n2. Patching scratch_16.js (Function detail layout loader)...');
let f16 = fs.readFileSync('./scratch_16.js', 'utf8');

const t16 = 'proxyRuleList:await j.forProject(e.region,e.project).proxy.listRules({queries:[k.equal(`type`,M.DEPLOYMENT),k.equal(`deploymentResourceType`,N.FUNCTION),k.equal(`deploymentResourceId`,e.function),k.equal(`deploymentId`,i.deploymentId),k.limit(1)]})';

const r16 = 'proxyRuleList:await j.forProject(e.region,e.project).proxy.listRules({queries:[k.equal(`type`,M.DEPLOYMENT),k.equal(`deploymentResourceType`,N.FUNCTION),k.equal(`deploymentResourceId`,e.function),k.equal(`deploymentId`,i.deploymentId),k.limit(1)]}).catch(()=>({rules:[],total:0}))';

if (f16.includes(t16)) {
    f16 = f16.replace(t16, r16);
    fs.writeFileSync('./scratch_16.js', f16);
    console.log('SUCCESS: Patched scratch_16.js!');
} else {
    console.error('ERROR: t16 pattern not found in scratch_16.js!');
}
