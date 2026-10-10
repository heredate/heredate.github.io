import sys
from PIL import Image, ImageDraw
out=sys.argv[1]; cols=int(sys.argv[2]); W=int(sys.argv[3]); fs=sys.argv[4:]
ims=[Image.open(f).convert('RGB') for f in fs]
H=int(W*ims[0].height/ims[0].width)
rows=(len(ims)+cols-1)//cols
S=Image.new('RGB',(W*cols,(H+22)*rows),(40,40,40));d=ImageDraw.Draw(S)
for i,(f,im) in enumerate(zip(fs,ims)):
  x,y=(i%cols)*W,(i//cols)*(H+22)
  S.paste(im.resize((W,int(W*im.height/im.width))).crop((0,0,W,H)),(x,y+22));d.text((x+4,y+4),f.split('/')[-1],fill=(255,255,0))
S.save(out,quality=85)
