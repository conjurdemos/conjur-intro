
#!/usr/bin/python
import ast
import json
import re
import sys
import getopt


def main(argv):
  input_file = ''
  output_file = ''

  try:
    opts, _ = getopt.getopt(argv, "hi:o:", ["input=", "output="])
  except getopt.GetoptError:
    print('parse_policy_response.py -i <input_file> -o <output_file>')
    sys.exit(2)

  for opt, arg in opts:
    if opt == '-h':
        print('parse_policy_response.py -i <input_file> -o <output_file>')
        sys.exit()
    elif opt in ("-i", "--input"):
        input_file = arg
    elif opt in ("-o", "--output"):
        output_file = arg

  if input_file == "" or output_file == "":
    print("Please specify an -i|-output and -o|--output file")
    sys.exit(2)

  parse(input_file, output_file)

def parse(input_file, output_file):
  # WARNING: This regex pattern is hard-coded in the load-policy.json!
  pattern = re.compile('RESPONSE BODY START (.*) RESPONSE BODY END')

  for i, line in enumerate(open(input_file)):
      for match in re.finditer(pattern, line):
          JSON_STRING=match.group(1)
          JSON_STRING=ast.literal_eval('"'+JSON_STRING+'"')
          JSON_STRING=json.loads(JSON_STRING)
          print('Found on line %s: %s' % (i+1, JSON_STRING))
          with open(output_file, 'w') as t:
              print("Writing output to: ", output_file)
              t.write(json.dumps(
                JSON_STRING,
                indent=4
              ))

if __name__ == "__main__":
   main(sys.argv[1:])

