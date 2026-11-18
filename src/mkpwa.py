# convierte el build en la app instalable (index.html + versión de caché del service worker) en la raíz del repo
import re,sys,os
W=os.path.dirname(os.path.abspath(__file__))+'/';R=W+'../';ver=sys.argv[1]
s=open(W+'build/MUSICA-GROOVEBOX-MOBILE-v%s.html'%ver).read()
head='''<link rel="manifest" href="manifest.webmanifest">
<meta name="theme-color" content="#232324">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Groovebox">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
</head>'''
assert s.count('</head>')==1 and s.count('</body>')==1
s=s.replace('</head>',head)
s=re.sub(r'<title>[^<]*</title>','<title>MUSICA Groovebox</title>',s,count=1)
s=s.replace('</body>','''<script>
/* app instalable: guarda la app en el teléfono para abrir sin internet y se actualiza sola */
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'))window.addEventListener('load',()=>{navigator.serviceWorker.register('sw.js').catch(()=>{});});
</script>
</body>''')
open(R+'index.html','w').write(s)
sw=open(R+'sw.js').read();sw=re.sub(r"const CACHE='musica-gb-v[^']+';","const CACHE='musica-gb-v%s';"%ver,sw);open(R+'sw.js','w').write(sw)
print('ok',ver)
