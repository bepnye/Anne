import abc
import csv
import os
import random
import sqlite3
import xml.etree.ElementTree as ET
from get_file_description import get_file_description
from data.by_row_description import by_row_description
import numpy as np
from functools import reduce


import article


class Reader(object, metaclass=abc.ABCMeta):
    """Read article information.

    A base class for providing article information
    to be annotated by the user.
    """

    @abc.abstractmethod
    def get_next_article(self):
        """Gets the next article to be annotated."""
        raise NotImplementedError('Method `get_next_article` must be defined')


class CSVReader(Reader):
    """Read from CSV files.

    A `Reader` implementation to support reading article data
    from a CSV file. Uses a buffer to preload a preset number
    of articles to speed up accessing the next article.
    """

    '''
    @param read_file represents a csv file location
    '''
    def __init__(self, read_file, buffer_size=None):
        self.read_file = read_file

        self.buffer = []
        self.current_pos = 0
        if not buffer_size:
            with open(self.read_file, 'r') as csvfile:
                lines = csv.DictReader(csvfile)
                file_length = sum(1 for line in lines)
                buffer_size = max(file_length // 10, 100)
        self.buffer_size = buffer_size
        self._add_to_buffer()
        import pprint; pprint.pprint(self.buffer)
        
    def _add_to_buffer(self):
        with open(self.read_file, 'r') as csvfile:
            lines = csv.DictReader(csvfile)
            for i, line in enumerate(lines):
                if i < self.current_pos:
                    continue
                self.current_pos += 1
                self.buffer.append(line)

    def get_next_article(self):
        if not self.buffer:
            self._add_to_buffer()
        try:
            entry = self.buffer.pop(0)
        except IndexError:
            # we have gone through the entire file
            return None
        return article.Article(id_=entry['id'],
                               title=entry['title'],
                               text=entry['text'])


class SQLiteReader(Reader):
    """Read from a SQLite database.

    A `Reader` implementation to read articles from
    a SQLite database. Requires that there exist columns
    titled 'title' and 'text' and that the rows are
    uniquely id'd beginning at 0.
    """

    def __init__(self, db_file, table):
        self.db_file = db_file
        self.table = table
        self.conn = sqlite3.connect(self.db_file)
        self.conn.text_factory = str
        self.cursor = self.conn.cursor()
        self.current_pos = 0

    def get_next_article(self):
        self.cursor.execute('SELECT title, text FROM {0} WHERE id={1}' \
                            .format(self.table, self.current_pos))
        articles = self.cursor.fetchall()
        if not articles or len(articles) != 1:
            return None
        art = article.Article(id_=self.current_pos,
                              title=articles[0][0],
                              text=articles[0][1])
        self.current_pos += 1
        return art


class XMLReader(Reader):
    """Read from XML files.

    A `Reader` implementation to read articles from XML files
    that are stored in a given path. Currently expects files to
    be of the form of an NLM article.
    """

    def __init__(self, path):
        self.path = path
        self.file_description = get_file_description()
        self.by_row_description = by_row_description()

    """
    Given the path that leads to a folder of ONLY XML files, the function
    will pick one and then return the name of it.
    """
    def _get_next_file(self, user):
        fname = 'data/{}.progress'.format(user)
        if not os.path.isfile(fname):
          with open(fname, 'w') as fout:
            fout.write('0')

        n = int(open(fname).read())
        ids = [l.strip() for l in open('data/order_{}.txt'.format(user)).readlines()]
        if n < len(ids):
          return ids[n]
        return None
        
    """
    Given the path that leads to a folder of ONLY XML files, the function
    will pick one and then return the name of it.
    """
    def _get_next_file_random(self):
        try:
            paths = os.listdir(self.path)
            if ('desktop.ini' in paths): # issue with internal works of windows
                paths.remove('desktop.ini')
            next_file = random.choice(paths)
        except IndexError as _:
            # Provided path has no files
            return None
        return next_file
    
    """
    Return the proper ids associated with this specific XML file.
    
    @param article_meta is the XML element that holds the article title.
    """
    def _get_ids(self, article_meta):
        ids = article_meta.findall('article-id')
        id_ = None # the number associated with the xml
        for id in ids:
            if 'pub-id-type' in id.attrib and id.attrib['pub-id-type'].lower() == 'pmc':
                id_ = id.text
        
        return id_
    
    
    """
    Return the title of the article.
    
    @param article_meta is the XML element that holds the article title.
    """
    def _get_title(self, article_meta):
        # grab the title and the text
        title_xml = article_meta.find('title-group').find('article-title') 
        title = ET.tostring(title_xml, encoding='utf8', method='text').decode('utf-8') 
        return title
    
    """
    Return the article split into sections. It will return an array of pairs, 
    with a given pair having a first entry of the title, and the second entry
    containing the actual text of that section.
    
    @param body represents the whole article.
    """
    def _get_sections(self, body):
      section_title = ''
      section_content = []
      for node in body.getchildren():
        if node.tag == 'sec':
          section_content.append(self._get_sections(node))
        elif node.tag == 'title':
          if node.text:
            section_title = { 'text': node.text, 'html': node.text }
          elif len(node) == 1:
            section_title = { 'text': node[0].text, 'html': ET.tostring(node[0]).decode() }
          else:
            section_title = {
              'text': ET.tostring(node, method = 'text').decode(),
              'html': ET.tostring(node).decode() }
        else:
          section_content.append(ET.tostring(node).decode())
      return [section_title, section_content]
    
    """
    Return all of the text in an XML file.
    
    @param body represents the main portion of the XML with the data.
    """
    def _get_full_text(self, body):
        text = ET.tostring(body).decode('utf-8')
        return text

    def _get_abstract(self, article_meta):
        abst_xml = article_meta.find('abstract')
        abst_info = self._get_sections(abst_xml)
        if abst_info[0] == '':
          abst_info[0] = { 'text': 'Abstract', 'html': 'Abstract' }
        return abst_info

    def _get_body(self, body):
        # We don't need the title for the top "body" node, only store the "section_info"
        body_sections = self._get_sections(body)[1]
        for i, sec in enumerate(body_sections):
          # ack, caught a section with no title - would jack up the nav tabs
          if type(sec) == str:
            body_sections[i] = [{'text': 'No Title', 'html': 'No Title'}, [sec]]
        return body_sections

    """
    Initialize the article to have the proper fields and extra information.
    """
    def _init_article_(self, next_file, article_meta, body):
        id_ = self._get_ids(article_meta)
        title = self._get_title(article_meta)   

        abstract = self._get_abstract(article_meta)
        body = self._get_body(body)

        text = [abstract] + body

        # store the path of this file
        art = article.Article(id_= id_, title=title, text=text)
        art.abstract = abstract
        art.get_extra()['path'] = next_file
                
        file_data = self.file_description.get(str(id_), [])
        sp_file_data = None
        for row in file_data:
            if (str(row['Unnamed: 0']) == str(next_file)):
                sp_file_data = row
         
        try:
            art.get_extra()['outcome'] = sp_file_data['Outcome']
            art.get_extra()['comparator'] = sp_file_data['Comparator']
            art.get_extra()['intervention'] = sp_file_data['Intervention']
        except:
            art.get_extra()['outcome'] = 'unk_outcome'
            art.get_extra()['comparator'] = 'unk_comparator'
            art.get_extra()['intervention'] = 'unk_intervention'
            
            
        return art

    def get_id_article(self, pmcid):
        path_to_file =  self.path + '/' + str(pmcid) + '.html' # the path to XML files
        et = ET.parse(path_to_file) 
        root = et.getroot() 
        
        front = root.find('front')
        article_meta = front.find('article-meta')
        body = root.find('body')

        art = self._init_article_(pmcid, article_meta, body)
        return art
      
    
    """
    Grabs a random XML article and displays it.
    If the next_file is not equal to 'None', then it will grab the full article.
    Otherwise, it will only display the abstract.
    """
    def get_next_article(self, user, next_file=None):

        next_file = next_file or self._get_next_file(user)
        if not next_file:
          return None
        art = self.get_id_article(next_file)
        return art
        

"""
Builder pattern for readers.
"""
def get_reader(reader):
    options = {
        'csv': CSVReader,
        'sql': SQLiteReader,
        'xml': XMLReader
    }
    if reader in options:
        return options[reader]
    raise Exception('{0} not a valid reader.'.format(reader))
