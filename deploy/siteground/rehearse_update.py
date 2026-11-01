"""Rehearse packaged updates with synthetic data in a NEW private work folder.

Does not deploy a site, access an existing wardrobe, or change hosting settings.
Use --transport pipe for finite checks on a host without opening another port.
"""
import argparse
import contextlib
import hashlib
import http.client
import json
import os
from pathlib import Path
import re
import socket
import subprocess
import sys
import time
import zipfile


def storage_run(source, code, *args):
    subprocess.run([sys.executable, '-c',
                    'import sys;sys.path.insert(0,sys.argv.pop(1)+"/runtime");\n' + code,
                    str(source), *map(str, args)], check=True)


SEED = r'''
import json, os, struct, zlib
from pathlib import Path
from storage import Store
folder, target, mib = Path(sys.argv[1]), Path(sys.argv[2]), int(sys.argv[3])
s=Store(folder)
def chunk(kind, data):
    return struct.pack('!I',len(data))+kind+data+struct.pack('!I',zlib.crc32(kind+data)&0xffffffff)
size=0; ids=[]
while size < mib*1024*1024:
    # Real, random-pixel PNGs keep the ZIP large rather than compressing away.
    raw=b''.join(b'\0'+os.urandom(1024*3) for _ in range(1024))
    png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!2I5B',1024,1024,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(raw,0))+chunk(b'IEND',b'')
    aid=s.upload(png); ids.append(aid);size+=len(png)
    s.set_record('custom',str(len(ids)),{'name':'Synthetic piece '+str(len(ids)),'meta':'Tops','size':'M','photoId':aid,'aesthetic':['cozy']})
s.set_record('profile','demo',{'synthetic':True})
s.set_record('edits','c-1',{'wears':['2026-01-01'],'note':'Keep this history'})
s.set_record('outfits','test',{'name':'Synthetic outfit','pieces':[{'id':'c-1','x':1,'y':2,'w':30}], 'wearLog':[{'d':'2026-01-01','ids':['c-1'],'added':['c-1']}]})
if 'outfitHistory' in s.state()['collections']:
    s.set_record('outfits','archived',{'name':'Synthetic deleted outfit','pieces':[{'id':'c-1','x':1,'y':2,'w':30}],'wearLog':[{'d':'2026-01-02','ids':['c-1'],'added':['c-1']}]})
    s.delete_record('outfits','archived')
s.set_record('trips','test',{'name':'Synthetic unfinished trip','settings':{'start':'','end':'','dest':'','must':['c-1']},'plan':None,'step':2,'checked':{}})
s.set_board({'pieces':[{'id':'c-1','x':12,'y':15,'w':30}]})
s.export(target)
target.with_suffix('.state.json').write_text(json.dumps(s.state()))
target.with_suffix('.verify.json').write_text(json.dumps(s.verification()))
'''

RESTORE = r'''
import contextlib,json
from pathlib import Path
from storage import Store,Archive
s=Store(sys.argv[1])
with contextlib.closing(Archive(sys.argv[2])) as archive:s.restore(archive)
Path(sys.argv[3]).write_text(json.dumps({'state':s.state(),'verification':s.verification()}))
'''


class Hosted:
    def __init__(self, source, data, transport):
        self.transport=transport
        env={**os.environ,'CLOSETLINT_DATA':str(data),'CLOSETLINT_ORIGIN':'https://closet.example.test','CLOSETLINT_PYTHON':sys.executable}
        self.log=open(data.parent/(data.name+'-'+transport+'.log'),'ab')
        if transport=='pipe':
            self.process=subprocess.Popen([sys.executable,str(source/'deploy/siteground/start.py'),'--data',str(data)],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=self.log,env=env)
            assert json.loads(self.process.stdout.readline())['type']=='ready'
        else:
            with socket.socket() as s:s.bind(('127.0.0.1',0));self.port=s.getsockname()[1]
            env['PORT']=str(self.port)
            self.process=subprocess.Popen(['node',str(source/'server.cjs')],stdout=self.log,stderr=self.log,env=env)
            for _ in range(200):
                if self.process.poll() is not None:raise RuntimeError('Gateway failed; see rehearsal log')
                try:
                    if self.request('GET','/')[0]==200:break
                except OSError:pass
                time.sleep(.05)
            else:raise RuntimeError('Gateway startup timed out')
        status,page=self.request('GET','/')
        assert status==200
        self.config=json.loads(re.search(rb'window.ClosetLintLocal=(.*?);</script>',page)[1])

    def request(self, method, path, value=None, target=None, extra=None):
        body=json.dumps(value).encode() if value is not None else b''
        headers={'Host':'closet.example.test','Content-Length':str(len(body))}
        if hasattr(self,'config'):headers.update({'X-ClosetLint-Token':self.config['token'],'Origin':'https://closet.example.test'})
        headers.update(extra or {})
        if self.transport=='pipe':
            headers['Host']='127.0.0.1:6684'
            if 'Origin' in headers:headers['Origin']='http://127.0.0.1:6684'
            frame={'method':method,'path':path,'headers':headers,'length':len(body)}
            self.process.stdin.write(json.dumps(frame).encode()+b'\n'+body);self.process.stdin.flush()
            response=json.loads(self.process.stdout.readline());status=response['status'];remaining=response['length']
            stream=self.process.stdout
            def read(n):
                nonlocal remaining
                part=stream.read(min(n,remaining));remaining-=len(part);return part
        else:
            conn=http.client.HTTPConnection('127.0.0.1',self.port,timeout=180)
            conn.request(method,path,body=body,headers=headers);response=conn.getresponse();status=response.status
            read=response.read
        try:
            if target:
                with open(target,'wb') as out:
                    while part:=read(1024*1024):out.write(part)
                return status,b''
            parts=[]
            while part:=read(1024*1024):parts.append(part)
            return status,b''.join(parts)
        finally:
            if self.transport!='pipe':conn.close()

    def close(self):
        if self.transport=='pipe':self.process.stdin.close()
        else:self.process.terminate()
        try:self.process.wait(timeout=10)
        except subprocess.TimeoutExpired:self.process.kill();self.process.wait()
        if self.process.stdout:self.process.stdout.close()
        self.log.close()


def comparable(state):
    return {k:state[k] for k in ('board','photos')} | {'collections':{k:v for k,v in state['collections'].items() if v}}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    for name in ('old-source','previous-hosted','candidate','work'):parser.add_argument('--'+name,type=Path,required=True)
    parser.add_argument('--large-mib',type=int,default=420)
    parser.add_argument('--transport',choices=('http','pipe'),default='http')
    args=parser.parse_args()
    if not 1<=args.large_mib<=450:parser.error('Choose 1–450 MiB, within the 512 MiB full-backup limit.')
    work=args.work.resolve()
    if work.exists() or 'public_html' in work.parts:parser.error('Choose a NEW private work folder outside public_html.')
    os.umask(0o077);work.mkdir(parents=True)
    report={'syntheticOnly':True,'transport':args.transport,'publicHostingLifecycleTested':False,'checks':[]}
    def passed(label):report['checks'].append(label);print(label,flush=True)
    started=time.monotonic()
    baseline=work/'before-update.zip';data=work/'candidate-data'
    storage_run(args.old_source,SEED,data,baseline,args.large_mib)
    with zipfile.ZipFile(baseline) as archive:report['baselineBackupFormat']=json.loads(archive.read('backup.json'))['formatVersion']
    before=json.loads(baseline.with_suffix('.state.json').read_text())
    hashes=json.loads(baseline.with_suffix('.verify.json').read_text())['assetHashes']
    passed('Created the baseline database and backup using the supplied older storage code')
    app=Hosted(args.candidate,data,args.transport)
    try:
        assert app.config.get('writeProtocol')==1 and app.config.get('atomicWear') is True
        state=json.loads(app.request('GET','/api/state')[1]);assert comparable(state)==comparable(before)
        passed('Candidate opens the old database without losing records, board, or history')
        for aid,expected in hashes.items():
            status,photo=app.request('GET','/_thumb/'+aid)
            assert status==200 and hashlib.sha256(photo).hexdigest()==expected
        passed('Every cold preview returns its exact original without optional photo tools')
        missing=app.config['missingVersion'];wear=[{'collection':'edits','id':'c-2','expected':missing,'value':{'wears':['2026-10-29']}}]
        assert app.request('POST','/api/wear',wear)[0]==200
        after=json.loads(app.request('GET','/api/state')[1])
        assert app.request('POST','/api/wear',wear)[0]==200
        assert json.loads(app.request('GET','/api/state')[1])==after
        assert app.request('PUT','/api/doc/edits/c-2',{'wears':[]},extra={'If-Match':'"'+missing+'"'})[0]==409
        passed('Atomic wear, identical retry, and stale overwrite refusal work in the package')
        updated=work/'after-update.zip';assert app.request('GET','/api/backup',target=updated)[0]==200
    finally:app.close()
    app=Hosted(args.candidate,data,args.transport)
    try:assert json.loads(app.request('GET','/api/state')[1])==after
    finally:app.close()
    passed('Restart preserves the post-update state')
    restored=work/'restored.json'
    storage_run(args.candidate,RESTORE,work/'restore-data',updated,restored)
    result=json.loads(restored.read_text())
    assert comparable(result['state'])==comparable(after)
    assert result['state']['base']==before['base']
    assert result['verification']['assetHashes']==hashes and result['verification']['integrity']=='ok'
    passed('Large post-update backup restores with exact record content and every photo hash')
    # Roll back safely into another folder, leaving all new work recoverable.
    for label,source in [('historical',args.old_source),('previous-hosted',args.previous_hosted)]:
        path=work/(label+'-restored.json');rollback=work/(label+'-data')
        storage_run(source,RESTORE,rollback,baseline,path)
        result=json.loads(path.read_text());assert comparable(result['state'])==comparable(before)
        assert result['state']['base']==before['base']
        assert result['verification']['assetHashes']==hashes and result['verification']['integrity']=='ok'
        if label=='previous-hosted':
            old=Hosted(source,rollback,args.transport)
            try:assert comparable(json.loads(old.request('GET','/api/state')[1]))==comparable(before)
            finally:old.close()
        passed(label+' rollback reads the pre-update backup; newer data and backup remain separate')
    report.update(ok=True,photos=len(hashes),backupBytes=updated.stat().st_size,elapsedSeconds=round(time.monotonic()-started,2),oldStorageSha256=hashlib.sha256((args.old_source/'runtime/storage.py').read_bytes()).hexdigest(),candidateManifestSha256=hashlib.sha256((args.candidate/'HOSTED-SOURCE-MANIFEST.json').read_bytes()).hexdigest())
    (work/'report.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))


if __name__=='__main__':main()
