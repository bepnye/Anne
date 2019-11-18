
class Annotator(object):
	"""Annotate articles.

	The main object of the application. Takes a
	`Reader` and a `Writer,` and uses them to
	provide an interface for annotating articles
	and submitting their annotations.
	"""

	def __init__(self, reader, writer):
		self.reader = reader
		self.writer = writer

	def get_next_article(self, userid, id_ = None):
		return self.reader.get_next_article(userid, id_)

	def submit_annotation(self, data):
		return self.writer.submit_annotation(data)

	def get_results(self):
		return self.writer.get_results()
		
	def get_next_file(self, id_ = None):
		return self.reader._get_next_file(id_)

	def get_id_article(self, id):
		return self.reader.get_id_article(id)
