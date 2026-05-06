import urllib.request
import xml.etree.ElementTree as ET
import re

def test_orf():
    url = 'https://rss.orf.at/news.xml'
    headers = {'User-Agent': 'Mozilla/5.0'}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as response:
        content = response.read().decode('utf-8')
    
    # Strip encoding declaration
    content = re.sub(r'<\?xml[^>]*\?>', '', content)
    root = ET.fromstring(content)
    
    items = root.findall('.//{*}item') or root.findall('.//item')
    print(f"Found {len(items)} items")
    
    for i, item in enumerate(items[:5]):
        url = item.findtext('link') or item.findtext('{*}link') or item.findtext('guid') or item.findtext('{*}guid')
        if not url and '{http://www.w3.org/1999/02/22-rdf-syntax-ns#}about' in item.attrib:
             url = item.attrib['{http://www.w3.org/1999/02/22-rdf-syntax-ns#}about']
        elif not url and 'rdf:about' in item.attrib:
             url = item.attrib['rdf:about']
             
        title = item.findtext('title') or item.findtext('{*}title')
        date = item.findtext('pubDate') or item.findtext('{*}pubDate') or item.findtext('{*}date')
        
        print(f"Item {i}:")
        print(f"  Title: {title}")
        print(f"  URL: {url}")
        print(f"  Date: {date}")
        print(f"  Attribs: {item.attrib}")

if __name__ == '__main__':
    test_orf()
