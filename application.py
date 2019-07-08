import flask
import json

import annotator
import article
import config
import reader
import writer
import numpy as np

import model_utils

application = flask.Flask(__name__)

anne = annotator.Annotator(reader.get_reader(config.reader)(**config.reader_params),
                           writer.get_writer(config.writer)(**config.writer_params))

valid_users = np.loadtxt('usernames.txt', delimiter = ',', dtype = 'str')
model_annotations = json.load(open('data/model_annotations.json'))
embeddings = json.load(open('data/embeddings.json'))

"""
Display the main page.
"""
@application.route('/', methods=['GET'])
def index():
    return flask.render_template('index.html')

"""
Start the program.
"""
@application.route('/start/', methods=['GET', 'POST'])
def start():
    userid = flask.request.form['userid']
    if not(userid in valid_users):
        return flask.render_template('index_invalid_user.html')
        
    id_ = anne.get_next_file(userid)
    if not id_:
        return flask.redirect(flask.url_for('finish'))
    else:
        return flask.redirect(flask.url_for('annotate_full', 
                                            userid = userid, 
                                            id_ = id_))
                
"""
Start the program, but show the error to the user first.
"""
@application.route('/invalid_user/', methods=['GET', 'POST'])
def invalid_user():
    userid = flask.request.form['userid']
    if not(userid in valid_users):
        return flask.render_template('index_invalid_user.html', should_show = "true")
    
    id_ = anne.get_next_file(userid)
    if not id_:
        return flask.redirect(flask.url_for('finish'))
    else:
        return flask.redirect(flask.url_for('annotate_abstract', 
                                            userid = userid, 
                                            id_ = id_))

"""
Display just the abstract.
"""    
@application.route('/annotate_abstract/<userid>/<id_>/', methods=['GET'])
def annotate_abstract(userid, id_ = None):
    if id_ is None:
        art = anne.get_next_article(userid)
    else:
        art = anne.get_next_article(userid, id_)
    
   
    if not art:
        return flask.redirect(flask.url_for('finish'))
    else:
        save_last_path(userid, art.get_extra()['path'])
        return flask.render_template('article.html',
                                     userid = userid,
                                     id = art.id_,
                                     pid = id_,
                                     tabs = json.dumps(art.text),
                                     xml_file = art.get_extra()['path'],
                                     outcome = art.get_extra()['outcome'],
                                     intervention = art.get_extra()['intervention'],
                                     comparator = art.get_extra()['comparator'],
                                     options = config.options_full)

"""
Grabs a specified article and displays the full text.
"""                             
@application.route('/annotate_full/<userid>/<id_>/', methods=['GET'])
def annotate_full(userid, id_ = None):
    try:
        if id_ is None:
            art = anne.get_next_article(userid)
        else:
            art = anne.get_next_article(userid, id_)
    except:
        return annotate_abstract(userid, id_)
    
    if not art:
        return flask.redirect(flask.url_for('finish'))
    else:
        return flask.render_template('full_article.html',
                                     userid = userid,
                                     id = art.id_,
                                     pid = id_,
                                     tabs = art.text,
                                     xml_file = get_last_path(userid),
                                     outcome = art.get_extra()['outcome'],
                                     intervention = art.get_extra()['intervention'],
                                     comparator = art.get_extra()['comparator'],
                                     options = config.options_full)

"""
Grabs a specified article and displays the full text.
"""                             
@application.route('/browse/<userid>/<id_>/', methods=['GET'])
def browse(userid, id_ = None):
    try:
        if id_ is None:
            art = anne.get_next_article(userid)
        else:
            art = anne.get_next_article(userid, id_)
    except:
        return annotate_abstract(userid, id_)
    
    if not art:
        return flask.redirect(flask.url_for('finish'))
    else:
        annos = model_annotations['docs'][id_]
        return flask.render_template('browse_article.html',
                                     userid = userid,
                                     id = art.id_,
                                     pid = id_,
                                     tabs = art.text,
                                     spans = annos,
                                     xml_file = get_last_path(userid),
                                     options = config.options_full)

@application.route('/evidence_map/trial_sizes/', methods=['GET'])
def trial_sizes():
  cluster_docs = { c: [] for c in i_clusters }
  for doc in model_annotations['docs'].values():
    doc_spans = set(i['text'] for i in doc['interventions'])
    for c, cluster_spans in i_clusters.items():
      if len(doc_spans & cluster_spans):
        cluster_docs[c].append(doc)

  return flask.render_template('trial_sizes.html',
      i_clusters = { k: list(v) for k,v in i_clusters.items() },
      docs = cluster_docs)

@application.route('/clusters/', methods=['GET'])
def clusters():
  return flask.render_template('clusters.html',
      clusters = model_utils.get_d3_dendro(embeddings))

@application.route('/evidence_map/head_to_head/', methods=['GET'])
def head_to_head():
  return flask.render_template('trial_sizes.html',
      trial_groups = trial_groups)
                                 
"""
Submits the article id with all annotations.
"""
@application.route('/submit/', methods=['POST'])
def submit(): 
    selected = flask.request.form['selection']
    userid = flask.request.form['userid']
    anne.submit_annotation(flask.request.form)

    # if the person can't tell just based off the abstract
    if (selected == 'Cannot tell based on the abstract'):
        return flask.redirect(flask.url_for('annotate_full', 
                                            userid = userid,
                                            id_= get_last_path(userid)))
                                            
    elif (selected == ''): # if they haven't selected anything, do nothing
        return None
    # otherwise go to the next abstract
    id_ = anne.get_next_file(userid)
    if not id_:
        return flask.redirect(flask.url_for('finish'))
    else:
        return flask.redirect(flask.url_for('annotate_abstract', 
                                            userid=userid,
                                            id_ = id_))

"""
Only go to this if there are no more articles to be annotated.
"""
@application.route('/finish/', methods=['GET'])
def finish():
    return flask.render_template('finish.html')

"""
Call the get results funciton.
"""
@application.route('/results/', methods=['GET'])
def results():
    return anne.get_results()
    
"""
Get the last path.
"""
def get_last_path(user):
    txt = np.genfromtxt(user + "_progress.txt", delimiter = ' ')
    return str(int(txt + 0))
    
def save_last_path(user, path):
    np.savetxt(user + "_progress.txt", [int(path)], delimiter = ' ',  fmt = '%.18e')

"""
Run the application.
"""
if __name__ == '__main__':
   #application.run()
   application.run(host = '0.0.0.0', port = 8081) 
