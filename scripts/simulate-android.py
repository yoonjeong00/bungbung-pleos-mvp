#!/usr/bin/env python3
"""Send debug-only simulation intents; never writes vehicle properties."""
import argparse, json, os, pathlib, shlex, subprocess, sys, time
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('scene',nargs='?',type=int,choices=range(1,11))
p.add_argument('--payload',help='JSON vehicle patch; unspecified signals retain their simulation value')
p.add_argument('--serial',default='emulator-5554')
p.add_argument('--tour',action='store_true',help='Interactive S1–S10; Enter advances')
a=p.parse_args()
if sum([a.scene is not None,a.payload is not None,a.tour])!=1:p.error('Choose a scene, --payload, or --tour')
sdk=pathlib.Path(os.environ.get('ANDROID_HOME',pathlib.Path.home()/'Library/Android/sdk'))
adb=sdk/'platform-tools/adb'
if not adb.is_file():sys.exit('adb not found: '+str(adb))
def send(extra):
 args=['am','start','-W','-a','com.hipnote.bungbung.SIMULATE','-n','com.hipnote.bungbung/.MainActivity',*extra]
 subprocess.run([str(adb),'-s',a.serial,'shell',shlex.join(args)],check=True)
if a.payload:
 data=json.loads(a.payload)
 if not isinstance(data,dict):sys.exit('payload must be a JSON object')
 send(['--es','payload',json.dumps(data,separators=(',',':'))])
elif a.tour:
 for i in range(1,11):
  input(f'S{i}: Enter to send (Ctrl+C to stop) ')
  send(['--ei','scene',str(i)])
else:send(['--ei','scene',str(a.scene)])
