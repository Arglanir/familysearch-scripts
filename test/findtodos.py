"""This script goes through the tree, and extract the things to do."""
from testbase import getFamilySearchDriver, selectThroughSR, goTo
import time, datetime
from collections import defaultdict as ddict

def main(startat=""):
    done = set()
    todo = [0]
    start = datetime.datetime.now()
    whattodos = ddict(list) # type => (identifier, name, text)
    with getFamilySearchDriver(  ) as driver:
        goTo(driver, startat)
        time.sleep(3)
        url = driver.current_url
        identifier = url.split("/")[-1]
        todo.append(identifier)
        betweengeneration = 1
        while todo:
            identifier = todo.pop(0)
            if isinstance(identifier, int):
                print("Starting generation", identifier, "(in previous:", betweengeneration, ")")
                todo.append(identifier+1)
                if betweengeneration == 0:
                    break
                betweengeneration = 0
                continue
            betweengeneration += 1
            print(datetime.datetime.now()-start, "- Doing", identifier, len(done), "done, ", len(todo)+1, "remaining")
            goTo(driver, identifier)
            time.sleep(3)
            while True:
                try:
                    nameel = selectThroughSR(driver, "fs-person-page",
                               "fs-tree-person-details", 
                               "fs-tree-person-vitals", 
                               "fs-tree-conclusion", 
                               "div.display-name")
                    nameel.text
                    break
                except KeyboardInterrupt:
                    raise
                except:
                    pass
                print("   Not ready yet")
                time.sleep(1)
            name = nameel.text
            print(" ", identifier, nameel.text)
            try:
                ul = selectThroughSR(driver, "fs-person-page", "fs-tree-person-details", "fs-tree-person-research-help", "fs-indicators-list", "ul")
                lis = ul.find_elements_by_tag_name("li")
                for li in lis:
                    icon = li.find_element_by_tag_name("fs-icon")
                    icontype = icon.get_attribute("icon")
                    whattodos[icontype].append((identifier, name, li.text))
            except Exception as e:
                print(repr(e))
            done.add(identifier)

            # finding parents
            for i in range(1,3):
                try:
                    parentel = selectThroughSR(driver, "fs-person-page",
                                   "fs-tree-person-details", 
                                   "fs-tree-person-family", 
                                   "fs-family-members", 
                                   "ul#parents",
                                   "fs-family-members-block",
                                   "fs-family-members-couple",
                                   "#spouse%s-display" % i)
                    ident = parentel.get_attribute("destination").split("/")[-1]
                    if ident not in done and ident not in todo:
                        todo.append(ident)
                    else:
                        print("  Found already found parent:", ident)
                except:
                    print("  no parent", i)
    end = datetime.datetime.now()
    print("Total time:", end - start)
    for todotype, entries in whattodos.items():
        print(todotype, ": (", len(entries), "entries)")
        lastiden = ""
        for iden, name, text in entries:
            if iden != lastiden:
                print("  ", iden, name)
                lastiden = iden
            print(" "*5, text.replace("\n", " "))
            
def testSomeone(driver, someone="L1M2-V8T"):
    with getFamilySearchDriver( False ) as driver:
        goTo(driver, someone)
        ul = selectThroughSR(driver, "fs-person-page", "fs-tree-person-details", "fs-tree-person-research-help", "fs-indicators-list", "ul")
        lis = ul.find_elements_by_tag_name("li")
        for li in lis:
            icon = li.find_element_by_tag_name("fs-icon")
            icontype = icon.get_attribute("icon")
            # record-hint-medium
            # research-suggestion-medium
            

if __name__ == "__main__":
    main("")

