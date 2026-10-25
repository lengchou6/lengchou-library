"""Import ten physical books from twenty unchanged cover photographs."""
import argparse,json,hashlib,shutil
from pathlib import Path
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('--source',type=Path,required=True);a=p.parse_args();r=Path(__file__).resolve().parents[1];path=r/'dist/data/books.json';d=json.loads(path.read_text());assert len(d['books'])==78
# title, subtitle, authors, translators, publisher, ISBN, price, photos, category
rows=[
('山海经全译',None,[('袁珂',None,'译注')],[],'北京联合出版公司','978-7-5502-8491-3',49.8,'150939','151009','人文与社科'),
('苏美尔神话',None,[('萨缪尔·诺亚·克拉莫尔','美国','著')],['叶舒宪','金立江'],'陕西师范大学出版总社','978-7-5695-3688-1',86,'151050','151101','人文与社科'),
('中国货币史（上册）',None,[('彭信威',None,'著')],[],'中国人民大学出版社',None,None,'151119','151133','人文与社科'),
('仿生人会梦见电子羊吗？',None,[('菲利普·迪克','美国','著')],['姚向辉'],'江苏凤凰文艺出版社','978-7-5594-8248-8',59.9,'151207','151218','文学与小说'),
('电影镜头设计','从构思到银幕',[('史蒂文·卡茨','美国','著')],['井迎兆','王旭锋'],'北京联合出版公司','978-7-5502-5145-8',88,'151329','151339','写作与叙事'),
('FPS关卡设计',None,[('李龙汰','韩国','著')],['武传海'],'人民邮电出版社','978-7-115-48588-5',69,'151405','151426','游戏与设计'),
('游戏机制','高级游戏设计技术',[('Ernest Adams',None,'著'),('Joris Dormans',None,'著')],['石曦'],'人民邮电出版社','978-7-115-34049-8',119.9,'151504','151515','游戏与设计'),
('游戏关卡设计',None,[('Phil Co','美国','著')],['姚晓光','孙泱'],'机械工业出版社','7-111-19872-7',35,'151551','151600','游戏与设计'),
('全景探秘游戏设计艺术',None,[('Jesse Schell','美国','著')],['吕阳','蒋韬','唐文'],'电子工业出版社','978-7-121-10634-7',69,'151616','151627','游戏与设计'),
('少数派报告',None,[('菲利普·迪克','美国','著')],['周昭蓉'],'译林出版社','978-7-5447-5655-6',58,'151641','151650','文学与小说')]
paths=[]
descriptions=[
'袁珂在古籍注释基础上整理、译注《山海经》，以现代汉语辅助理解其中的地理、神话与异兽记载。',
'整理、介绍苏美尔泥版文献中保存的神话材料，呈现苏美尔神话体系及其文化背景。',
'彭信威研究中国货币制度、钱币与货币流通历史的著作；本次录入为上册。',
'赏金猎人德卡德追捕逃亡仿生人，在人与仿生人的边界中面对记忆、同理心与身份的疑问。',
'从剧本构思到故事板与实际拍摄，介绍镜头设计、机位、调度及影像叙事方法。',
'围绕三维第一人称射击游戏，介绍关卡概念、空间构成、战场设计及制作中的思考方法。',
'围绕规则、流程和数据分析游戏机制，介绍机制的设计、原型构建、模拟与可视化方法。',
'介绍关卡设计在游戏开发中的作用，以及关卡创意、挑战、描述、制作与迭代方法。',
'以多种观察游戏的设计透镜引导思考，讨论玩家体验、规则、故事、美学与游戏设计实践。',
'菲利普·迪克的九篇科幻短篇选集，收录《少数派报告》《全面回忆》《第二代》等作品。']
for i,row in enumerate(rows,79):
 title,sub,authors,trans,publisher,isbn,price,front,back,category=row;ident=f'LC-{i:06}';photos=[]
 for stamp,side,label in [(front,'front','正面'),(back,'back','背面')]:
  src=a.source/f'IMG_20261025_{stamp}.jpg';dest=r/f'dist/assets/{ident}/{side}-original.jpg';dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dest)
  with Image.open(src) as image:w,h=image.size
  rel=dest.relative_to(r/'dist').as_posix();paths.append(dest.relative_to(r).as_posix());photos.append(dict(side=side,label=label,file=rel,original=rel,sourceFilename=src.name,capturedAt=f'2026-10-25T{stamp[:2]}:{stamp[2:4]}:{stamp[4:]}+08:00',timePrecision='second',timeSource='文件名精确至秒，照片水印核对至分钟；未据文件修改时间推定拍摄时间',sha256=hashlib.sha256(src.read_bytes()).hexdigest(),width=w,height=h))
 condition='封面、封底与边角可见轻微使用痕迹；未检查内页及装订。'
 if i in [80,81,87]:condition='封面、封底边缘和书角可见折痕、磕碰或磨损；未检查内页及装订。'
 b=dict(id=ident,title=title,subtitle=sub,authors=[dict(name=name,country=country,role=role) for name,country,role in authors],translators=trans,publisher=publisher,isbn=isbn,category=category,tags=[category],usageTags={'人文与社科':['资料参考'],'文学与小说':['文学阅读'],'写作与叙事':['写作参考','影像叙事'],'游戏与设计':['游戏设计参考']}[category],language='zh-Hans',languageLabel='中文',series=None,seriesGroupId=None,seriesNumber=None,seriesLabel=None,purchaseGroupId=None,orientation='portrait',publicationDate=None,edition=None,listPrice=price,paidPrice=None,currency='CNY',purchaseDate=None,purchaseChannel=None,accessionedAt=photos[0]['capturedAt'],readingStatus=None,location=None,notes='书目与定价据实体正反面照片；版次及印次未从版权页核实。',description=descriptions[i-79],metadataSource='用户上传的实体书封面和封底照片',photos=photos,condition=dict(label='有明显磨损' if i in [80,81,87] else '有使用痕迹',note=condition,scope='外观',source='照片预估',assessedOn='2026-10-25'))
 if i==79:b.update(titleAliases=['山海经','山海经 全译'],coverEditionLabel='全译')
 if i==80:b.update(originalTitle='Sumerian Mythology',series='神话学文库')
 if i==81:b.update(series='中国货币史',seriesLabel='上册',notes=b['notes']+' 本次照片未展示ISBN或定价，均留空；仅录入上册，不推定持有下册，不推定整套价格。')
 if i==82:b.update(originalTitle='Do Androids Dream of Electric Sheep?',series='读客科幻文库',seriesLabel='170',titleAliases=['仿生人会梦见电子羊吗','银翼杀手原著'])
 if i==83:b.update(originalTitle='Film Directing Shot by Shot',coverEditionLabel='25周年纪念版')
 if i==84:b.update(originalTitle='FPS Level Design',series='图灵程序设计丛书')
 if i==85:b.update(originalTitle='Game Mechanics: Advanced Game Design',series='游戏设计与开发')
 if i==86:b.update(originalTitle='Level Design for Games: Creating Compelling Game Experiences',series='游戏开发技术系列丛书',notes=b['notes']+' 封面标示附赠光盘，未核实该实体册当前是否附有光盘。ISBN按封底ISBN-10原样记录。')
 if i==87:b.update(originalTitle='The Art of Game Design: A Book of Lenses',titleAliases=['全景探秘 游戏设计艺术','游戏设计艺术','透镜游戏设计'])
 if i==88:b.update(originalTitle='The Minority Report',notes=b['notes']+' 本册是九篇科幻短篇选集，不仅为同名单篇小说。')
 d['books'].append(b)
path.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
(r/'docs/batch_20261025_1509.json').write_text(json.dumps(dict(books=[b['id'] for b in d['books'][-10:]],originalPaths=paths,source='2026-10-25 15:09—15:16 用户上传20张正反面照片',unconfirmed={'LC-000081':['ISBN','定价']}),ensure_ascii=False,indent=2)+'\n')
Path('/workspace/scratch/d7434e3573fb/batch25-1509-paths.json').write_text(json.dumps(paths));print('Imported 10 books / 20 originals')
