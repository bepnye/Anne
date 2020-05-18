import flask
import json
import re
import glob
from collections import defaultdict

import annotator
import article
import config
import reader
import writer
import numpy as np
import pandas as pd

application = flask.Flask(__name__)

anne = annotator.Annotator(reader.get_reader(config.reader)(**config.reader_params),
													 writer.get_writer(config.writer)(**config.writer_params))

valid_users = np.loadtxt('usernames.txt', delimiter = ',', dtype = 'str')
all_anns = pd.read_csv('data/exhaustive_ico.csv')

def collect_html(a):
	html = []
	for e in a:
		if type(e) == dict:
			html.append(e['html'])
		elif type(e) == str:
			html.append(e)
		elif type(e) == list:
			html += collect_html(e)
		else:
			print('Unknown article node type: {}'.format(type(e)))
	return html

def get_attr_value(tag, attr_name, cast = int):
	attr_idx = tag.find(attr_name)
	value_i = attr_idx + len(attr_name) + 2 # leading attr="
	value_f = tag.index('"', value_i) # trailing "
	return cast(tag[value_i:value_f])

def extract_xml_offsets(html_text):
	tags = [html_text[m.start():m.end()] for m in re.finditer(r'<offsets.*?>', html_text)]
	offsets = [(get_attr_value(t, 'xml_i'), get_attr_value(t, 'xml_f')) for t in tags]
	return offsets

def fix_exhaustive_offsets():
	ids = set(all_anns.RowID)
	for i in ids:
		art = anne.reader.get_id_article('PMC{}'.format(i))
		abst_end = get_abst_end(art)
		html_strs = collect_html(art.abstract)

		anns = all_anns[all_anns.RowID == i]
		for i, row in anns.iterrows():
			xml_i, xml_f = row.xml_offsets.split(':')
			try:
				if int(xml_f) <= abst_end:
					continue
			except ValueError:
				pass
			for html_str in html_strs:
				reason_idx = html_str.find(row.Reasoning)
				if reason_idx >= 0:
					# Ok cool, we found the reasoning in the abstract
					# the html_str can have a bunch of <offsets> nodes, so make sure to get the right one
					# lets find the one immediately preceding the Reason str
					html_prefix = html_str[:reason_idx]
					offset_xml_i, offset_xml_f = extract_xml_offsets(html_prefix)[-1]
					# ok now the Reason string itself can be further in to the node
					# we can't use reason_idx since who knows how much extra junk came before the <offsets>
					offset_tag_end = html_prefix.rfind('>') + 1
					# blah blah blah <offsets blah blah>html_prefix reason_idx blah</offsets>
					node_offset = reason_idx - offset_tag_end
					reason_i = offset_xml_i + node_offset
					reason_f = offset_xml_i + node_offset + len(row.Reasoning)
					print('[{}:{} => {}:{}] {}'.format(xml_i, xml_f, reason_i, reason_f, row.Reasoning))
					all_anns.loc[i, 'xml_offsets'] = '{}:{}'.format(reason_i, reason_f)
					break

def get_user_worklist(user):
  all_pmids = set(map(str, all_anns.RowID))
  print('Found ICO data for {} pmids. Generating worklist for {}'.format(len(all_pmids), user))
  done_pmids = { f.split('/')[-1].split('_')[1] for f in glob.glob('all_outputs/{}_*_coref.json'.format(user)) }
  print('\t{} docs done'.format(len(done_pmids)))
  todo_pmids = []
  bad_pmids = []
  for pmid in all_pmids:
    art = anne.reader.get_id_article('PMC'+pmid)
    icos = get_ico_anns(art, 'PMC'+pmid)
    if len(icos) == 0:
      bad_pmids.append(pmid)
    else:
      if pmid not in done_pmids:
        todo_pmids.append(pmid)
  print('\t{} docs todo'.format(len(todo_pmids)))
  print('\t{} docs bad (no frames)'.format(len(bad_pmids)))
  return todo_pmids

def write_user_worklist(user):
  todo_pmids = get_user_worklist(user)
  with open('data/order_{}.txt'.format(user), 'w') as fout:
    fout.write('\n'.join(['PMC'+p for p in todo_pmids]))
  with open('data/{}.progress'.format(user), 'w') as fout:
    fout.write('0')

"""
Display the main page.
"""
@application.route('/', methods=['GET'])
def index():
		return flask.render_template('index.html')

"""
Start the program.
"""
@application.route('/start/<userid>/', defaults={'ann_type':'full'}, methods=['GET', 'POST'])
@application.route('/start/<userid>/<ann_type>/', methods=['GET', 'POST'])
def start(userid, ann_type = 'abst'):
		if not(userid in valid_users):
				return flask.render_template('index_invalid_user.html')
				
		id_ = anne.get_next_file(userid)

		if not id_:
				return flask.redirect(flask.url_for('finish'))
		else:
				return flask.redirect(flask.url_for('annotate_article', 
																						userid = userid, 
																						id_ = id_,
																						ann_type = ann_type))
								
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
				return flask.redirect(flask.url_for('annotate_article', 
																						userid = userid, 
																						id_ = id_,
																						ann_type = 'full'))

def get_abst_end(art):
	abst_end = art.abstract
	# recurse in to subsecs until we hit the last string of the last sec
	while type(abst_end) != str:
		abst_end = abst_end[-1]
	xml_i, xml_f = extract_xml_offsets(abst_end)[-1]
	return xml_f

def get_ico_anns(art, id_, abst_only = True):
	id_anns = all_anns[all_anns.RowID == int(id_.replace('PMC', ''))]
	if abst_only:
		abst_f = get_abst_end(art)
		def in_abst(r):
			try:
				xml_i, xml_f = map(int, r.xml_offsets.split(':'))
				return xml_f <= abst_f
			except ValueError:
				return False
		id_anns = id_anns[id_anns.apply(in_abst, axis = 1)]
	return id_anns[['Intervention', 'Comparator', 'Outcome', 'Reasoning', 'xml_offsets']].to_dict(orient = 'records')

"""
Grabs a specified article and displays the full text.
"""
@application.route('/annotate_article/<ann_type>/<userid>/<id_>/', methods=['GET'])
def annotate_article(userid, id_, ann_type):
	if id_ is None:
			art = anne.get_next_article(userid)
	else:
			art = anne.get_next_article(userid, id_)

	if ann_type == 'abst':
		abst_only = True
		tabs = art.text[0:1]
	else:
		abst_only = False
		tabs = art.text

	anns = get_ico_anns(art, id_, abst_only)

	if not art:
		return flask.redirect(flask.url_for('finish'))

	save_last_path(userid, art.get_extra()['path'])
	return flask.render_template('annotate_article.html',
															 ann_type = ann_type,
															 userid = userid,
															 annotations = anns,
															 id = art.id_,
															 pid = id_,
															 tabs = tabs,
															 xml_file = get_last_path(userid),
															 outcome = art.get_extra()['outcome'],
															 intervention = art.get_extra()['intervention'],
															 comparator = art.get_extra()['comparator'],
															 options = config.options_full)

"""
Grabs a specified article and displays the full text.
"""														 
@application.route('/browse/', methods=['GET'])
def browse_start():
	art = anne.get_next_article(None, None)
	return flask.render_template('browse_article.html',
															 id = art.id_,
															 tabs = art.text,
															 text = art.raw_text,
															 anns = art.annotations,
															 options = config.options_full)

@application.route('/browse/<id_>/', methods=['GET'])
def browse(id_ = None):
		art = anne.get_id_article(id_)
		anns = get_ico_anns(art, id_, True)
		tabs = art.text[0:1]
		return flask.render_template('annotate_article.html',
															 ann_type = 'abst',
															 userid = None,
															 annotations = anns,
															 id = art.id_,
															 pid = id_,
															 tabs = tabs,
															 browse = 'true',
															 xml_file = id_,
															 outcome = art.get_extra()['outcome'],
															 intervention = art.get_extra()['intervention'],
															 comparator = art.get_extra()['comparator'],
															 options = config.options_full)

@application.route('/instructions/')
def instructions():
	return flask.render_template('instructions.html')
																 
"""
Submits the article id with all annotations.
"""
@application.route('/submit/', methods=['POST'])
def submit(): 
		userid = flask.request.form['userid']
		anne.submit_annotation(flask.request.form)

		id_ = anne.get_next_file(userid)
		ann_type = flask.request.form['ann_type']
		if not id_:
				return flask.redirect(flask.url_for('finish'))
		else:
			return flask.redirect(flask.url_for('annotate_article',
				userid = userid,
				id_ = id_,
				ann_type = ann_type))

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
def get_user_progress_fname(user):
	return 'data/{}_cur_fname.txt'.format(user)

def get_last_path(user):
	return open(get_user_progress_fname(user)).read()
		
def save_last_path(user, path):
	with open(get_user_progress_fname(user), 'w') as fp:
	 fp.write(path)

"""
Run the application.
"""
if __name__ == '__main__':
	 #application.run()
	 application.run(host = '0.0.0.0', port = 8000, debug = True) 
