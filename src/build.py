# arma el HTML de un solo archivo desde parts/ → build/MUSICA-GROOVEBOX-MOBILE-v<ver>.html
import re,sys,os
W=os.path.dirname(os.path.abspath(__file__))+'/';ver=sys.argv[1]
p1=open(W+'parts/p1.html').read();p2=open(W+'parts/p2.js').read();p3=open(W+'parts/p3.js').read()
noop="  if(C.mode==='one'&&dur){ /* secuenciador: one-shot completo */ }\n"
p2=p2.replace(noop,'').rstrip()
assert p2.endswith('</script>');p2=p2[:-9]
gb=open(W+'gb.txt').read().strip()   # window.GB = exportaciones para los tests
old=re.search(r'window\.GB=\{.*\};',p3).group(0)
p3=p3.replace(old,gb)
import datetime
p3=p3.replace('__GBVER__',ver).replace('__GBDATE__',datetime.date.today().strftime('%Y%m%d'))   # versión en el menú
os.makedirs(W+'build',exist_ok=True)
open(W+'build/MUSICA-GROOVEBOX-MOBILE-v%s.html'%ver,'w').write(p1+p2+p3)
print('built',ver,len(p1+p2+p3))
