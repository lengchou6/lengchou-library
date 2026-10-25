"""Import twelve physical books and update the previously accessioned currency-history volume."""
import argparse,json,hashlib,shutil
from pathlib import Path
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('--source',type=Path,required=True);a=p.parse_args();r=Path(__file__).resolve().parents[1];path=r/'dist/data/books.json';d=json.loads(path.read_text());assert len(d['books'])==88
rows=[
('中国货币史（下册）',None,['彭信威'],[],'中国人民大学出版社','978-7-300-27584-0',None,'153817','153831','人文与社科'),
('游戏设计梦工厂','以游玩体验为核心，创造开创性的游戏',['Tracy Fullerton'],['陈潮'],'电子工业出版社','978-7-121-43348-1',168,'153932','153944','游戏与设计'),
('游戏开发核心技术','剧本和角色创造',['Marianne Krawczyk','Jeannie Novak'],['姚晓光','孙泱'],'机械工业出版社','978-7-111-21197-6',49,'154036','154052','写作与叙事'),
('体验引擎','游戏设计全景探秘',['Tynan Sylvester'],['秦彬'],'电子工业出版社','978-7-121-25379-9',79,'154115','154124','游戏与设计'),
('平衡掌控者','游戏数值经济设计',['似水无痕'],[],'电子工业出版社','978-7-121-39363-1',79,'154155','154209','游戏与设计'),
('平衡掌控者','游戏数值战斗设计',['似水无痕'],[],'电子工业出版社','978-7-121-31239-7',65,'154237','154246','游戏与设计'),
('千面英雄',None,['约瑟夫·坎贝尔'],['黄珏苹'],'浙江人民出版社','978-7-213-06947-5',118.9,'154311','154322','人文与社科'),
('游戏数据分析的艺术',None,['于洋','余敏雄','吴娜','师胜柱'],[],'机械工业出版社','978-7-111-50780-2',79,'154349','154401','游戏与设计'),
('江湖丛谈',None,['连阔如'],[],'江苏凤凰文艺出版社','978-7-5594-8572-4',68,'154443','154455','人文与社科'),
('屠龙记','创造游戏世界的艺术',['Robert Denton Bryant','Keith Giglio'],['许格格'],'电子工业出版社','978-7-121-31776-7',75,'154533','154545','写作与叙事'),
('古事记',None,['安万侣'],['周作人'],'上海人民出版社','978-7-208-13052-4',39,'154603','154614','人文与社科'),
('中国神话传说','从盘古到秦始皇',['袁珂'],[],'世界图书出版公司','978-7-5100-4048-1',49.8,'154633','154642','人文与社科')]
descriptions=['彭信威研究中国货币制度、钱币与货币流通历史的著作；本册为下册，与已录入上册关联。','围绕游玩体验介绍游戏构思、原型、测试与迭代的设计方法。','介绍游戏剧本与角色开发，讨论故事结构及角色塑造在互动作品中的应用。','从玩家体验出发，讨论机制、故事、情绪、互动及设计迭代。','介绍游戏经济体系与相关数值设计方法。','介绍游戏战斗系统中的数值设计及平衡思路。','通过比较神话研究英雄故事中的共同结构与成长历程。','介绍游戏数据指标与分析方法，涉及用户、运营、收入、内容及渠道等层面。','记述旧时江湖行业、人物及相关民俗文化。','面向游戏创作者介绍互动叙事、剧本写作与游戏世界的构建方法。','日本古典文献，记录神话、传说与早期世系；本册为周作人译本。','袁珂整理、讲述中国古代神话传说，范围从盘古开天至秦始皇时期。']
paths=[]
for i,row in enumerate(rows,89):
 title,sub,names,trans,publisher,isbn,price,front,back,category=row;ident=f'LC-{i:06}';photos=[]
 for stamp,side,label in [(front,'front','正面'),(back,'back','背面')]:
  src=a.source/f'IMG_20261025_{stamp}.jpg';dest=r/f'dist/assets/{ident}/{side}-original.jpg';dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dest)
  with Image.open(src) as image:w,h=image.size
  rel=dest.relative_to(r/'dist').as_posix();paths.append(dest.relative_to(r).as_posix());photos.append(dict(side=side,label=label,file=rel,original=rel,sourceFilename=src.name,capturedAt=f'2026-10-25T{stamp[:2]}:{stamp[2:4]}:{stamp[4:]}+08:00',timePrecision='second',timeSource='文件名精确至秒，照片水印核对至分钟',sha256=hashlib.sha256(src.read_bytes()).hexdigest(),width=w,height=h))
 country='美国' if i in [90,91,92,95,98] else ('日本' if i==99 else None)
 b=dict(id=ident,title=title,subtitle=sub,authors=[dict(name=name,country=country,role='著') for name in names],translators=trans,publisher=publisher,isbn=isbn,category=category,tags=[category],usageTags={'人文与社科':['资料参考'],'游戏与设计':['游戏设计参考'],'写作与叙事':['写作参考','游戏叙事']}[category],language='zh-Hans',languageLabel='中文',series=None,seriesGroupId=None,seriesNumber=None,seriesLabel=None,purchaseGroupId=None,orientation='portrait',publicationDate=None,edition=None,listPrice=price,paidPrice=None,currency='CNY',purchaseDate=None,purchaseChannel=None,accessionedAt=photos[0]['capturedAt'],readingStatus=None,location=None,notes='书目与定价据实体正反面照片，未核实版权页版次和印次。',description=descriptions[i-89],metadataSource='用户上传的实体书封面和封底照片',photos=photos,condition=dict(label='有使用痕迹',note='封面、封底与边角可见使用痕迹；未检查内页及装订。',scope='外观',source='照片预估',assessedOn='2026-10-25'))
 if i==90:b.update(coverEditionLabel='第4版',originalTitle='Game Design Workshop: A Playcentric Approach to Creating Innovative Games')
 if i==91:b.update(series='游戏开发技术系列丛书',originalTitle='Game Development Essentials: Game Story and Character Development',notes=b['notes']+' 封面标示附赠光盘，未核实当前附件实况。')
 if i==92:b['originalTitle']='Designing Games: A Guide to Engineering Experiences'
 if i in [93,94]:b.update(series='平衡掌控者',seriesGroupId='balance-master',seriesNumber=1 if i==94 else 2,seriesLabel='战斗设计' if i==94 else '经济设计')
 if i==95:b['originalTitle']='The Hero with a Thousand Faces'
 if i==96:b.update(originalTitle='The Art of Game Analytics',series='数据分析与决策技术丛书')
 if i==98:b['originalTitle']='Slay the Dragon: Writing Great Video Games'
 if i==99:b.update(originalTitle='古事記',titleAliases=['太安万侣','Kojiki'])
 d['books'].append(b)
# The lower cover explicitly identifies the shared ISBN and two-volume price.
for b in d['books']:
 if b['id'] in ['LC-000081','LC-000089']:
  upper=b['id']=='LC-000081';b.update(isbn='978-7-300-27584-0',isbnScope='全两册套书ISBN，据下册封底；非单册独立ISBN',physicalSetId='chinese-currency-history-set',priceGroupId='chinese-currency-history-price',series='中国货币史',seriesGroupId='chinese-currency-history',seriesNumber=1 if upper else 2,seriesLabel='上册' if upper else '下册',listPrice=None)
  b['notes']='上下册分别建档。下册封底标示ISBN 978-7-300-27584-0、全二册198元，作为套书信息记录，整套定价仅累计一次；未推定购买时间或实付价格。'
d['priceGroups'].append(dict(id='chinese-currency-history-price',label='中国货币史（全两册）',amount=198,currency='CNY',bookIds=['LC-000081','LC-000089'],source='下册封底明确标示198.00元（全二册）'))
d['seriesGroups'] += [dict(id='chinese-currency-history',title='中国货币史（上下册）',shortTitle='中国货币史',kind='上下册',description='上下册独立实体记录，共用套书ISBN与整套定价。'),dict(id='balance-master',title='平衡掌控者系列',shortTitle='平衡掌控者',kind='同名书系',description='战斗设计与经济设计分别建档，各自独立ISBN和定价。')]
path.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');(r/'docs/batch_20261025_1538.json').write_text(json.dumps(dict(newBooks=[b['id'] for b in d['books'][-12:]],updatedBooks=['LC-000081'],originalPaths=paths,source='2026-10-25 15:38—15:46 共24张唯一实拍照片，重复附件只处理一次'),ensure_ascii=False,indent=2)+'\n');Path('/workspace/scratch/d7434e3573fb/batch1538-paths.json').write_text(json.dumps(paths));print('Imported 12 books; updated upper volume; 24 originals')
