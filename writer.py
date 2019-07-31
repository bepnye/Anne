import abc
import json
import csv
from pathlib import Path
import pandas as pd
import numpy as np

class Writer(object, metaclass=abc.ABCMeta):
    """Write annotation information.

    A base class for writing annotation information
    out after the article has been annotated by
    the user.
    """

    @abc.abstractmethod
    def submit_annotation(self, id_, annotations):
        """Submits an annotation."""
        raise NotImplementedError('Method `submit_annotation` must be defined')

    @abc.abstractmethod
    def get_results(self):
        """Returns results of project."""
        raise NotImplementedError('Method `get_results` must be defined')


class CSVWriter(Writer):
    """Write to CSV files.

    A `Writer` implementation that writes annotation
    information out to a CSV file. If multiple annotations
    for a single article are provided, they are entered
    in separate columns.

    Writes to CSV in form:
    article_id, annotation1, annotation2, ...
    """

    def __init__(self, write_file):
        self.write_file = write_file

    def submit_annotation(self, data):
        self.update_user_progress(data['userid'])
                               
        path = './/all_outputs//{}_{}_coref.json'.format(data['userid'], data['id'])
        with open(path, 'w') as fout:
          fout.write(data['corefs']);

        return None
       
    """
    Call this method when the user has finished annotating something. This 
    incriments the persons progress on work!
    """
    def update_user_progress(self, user):
      fname = 'data/{}.progress'.format(user)
      n = int(open(fname).read())
      with open(fname, 'w') as fout:
        fout.write(str(n+1))

    def get_results(self):
        with open(self.write_file, 'r') as csvfile:
            lines = csvfile.readlines()
        return '<br><br>'.join(lines)
        
    """
    Goal is to format the data into an array.
    """
    def __finish_data__(self, form):
        annotations = eval(form['annotations'])
        userid = form['userid'] 
        id_ = form['id']
        promptid = form['pid']
        selection = form['selection']
        outcome = form['outcome']
        comparator = form['comparator']
        intervention = form['intervention']
        invalid_prompt = 0
        prompt_reason = ""
        
        
        annotation_str = ''
        # parse the data, join each sentence with a ","
        for i in range(len(annotations)): 
            annotation_str += annotations[i]
            if (i != (len(annotations) - 1)):
                annotation_str += ","     
        
        if (selection == "Invalid Prompt"):
            prompt_reason = annotation_str
            annotation_str = ""
            invalid_prompt = 1
            
        save_data = [userid, promptid, id_, selection, annotation_str, outcome, 
                     comparator, intervention, invalid_prompt, prompt_reason]
                
        
        return save_data
        


class SQLiteWriter(Writer):
    """Write to a SQLite database.

    A `Writer` implementation to support writing
    annotation data out to a database. If multiple
    annotations exist for one Article, they will
    be entered as separate rows in the database.

    Expects columns of form:
    article_id, annotation
    """

    def __init__(self, db_file, table):
        self.db_file = db_file
        self.table = table
        self.conn = sqlite3.connect(self.db_file)
        self.conn.text_factory = str
        self.cursor = self.conn.cursor()
        self.current_pos = 0

    def submit_annotation(self, id_, annotations):
        for annotation in annotations:
            self.cursor.execute('INSERT INTO {0} VALUES({1}, {2})' \
                                .format(self.table, id_, annotation))
        self.cursor.commit()

    def get_results(self):
        self.cursor.execute('SELECT * FROM {0}'.format(self.table))
        rows = self.cursor.fetchall()
        return json.dumps(rows)


def get_writer(writer):
    options = {
        'csv': CSVWriter,
        'sql': SQLiteWriter,
    }
    if writer in options:
        return options[writer]
    raise Exception('{0} not a valid writer.'.format(writer))
