# familysearch-scripts
Scripts useful when working with [FamilySearch](https://www.familysearch.org/)

## Usage
Open FamilySearch, log in, then navigate to the page of one person, like [yourself](https://www.familysearch.org/tree/person)

In a javascript console, copy/paste the content of [recursive-search.js](recursive-search.js), then you can copy/paste one of the following scripts:

### From yourself:
* [family-names-cloud.js](family-names-cloud.js): allows you to create a name cloud of the family names.
* [family-depth.js](family-depth.js): allows you to find the ending lines in your genealogy.
* [family-get-workers.js](family-get-workers.js): Get all workers that worked inside your tree, and where. (may be long)

### From an ancestor:
* [family-lines-down.js](family-lines-down.js): allows you to find lines descending from an ancestor.
* [family-birthdays.js](family-birthdays.js): Creates a file listing all birthdays of the descendants.

## Using Python/selenium
You can also use scripts in [test](test) in order to automate the copy/pasting. They are used also to check whether
FamilySearch API changes.
* [followallancestors.py](test/followallancestors.py): go inside all ancestors and mark them as followed, to receive
notification when there is any change.
* [findtodos.py](test/findtodos.py): find every todo task provided by Family Search, if you are looking
for something specific to do.
* 🚧 [copytree.py](test/copytree.py) 🚧: Work in progress, copy some information from one tree to another.
