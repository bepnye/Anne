# The reader to use, along with the paramaters that
# it accepts in it's constructor
#
# Options: csv, sql, xml
reader = 'xml'
reader_params = {
    'path': './docs/'
}

# The writer to use, along with the paramaters that
# it accepts in its constructor
#
# Options: csv, sql
writer = 'csv'
writer_params = {
    'write_file': 'output.csv'
}

# If an additional list of checkboxes should be added
# to the interface, the options to be provided
options = [
    'Significantly increased',
    'Significantly decreased',
    'No significant difference',
    'Cannot tell based on the abstract'
]

options_full = [
    'Significantly increased',
    'Significantly decreased',
    'No significant difference'
]
