"""This script goes through the whole tree and follows all ancestors.
Does not go inside the children and theirs spouses."""

from testbase import getFamilySearchDriver, selectThroughSR, goTo
import time, datetime

def main():
    done = set()
    clicked = list()
    todo = [0]
    start = datetime.datetime.now()
    with getFamilySearchDriver(  ) as driver:
        goTo(driver, "")
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
            print(" ", nameel.text)
            try:
                elwatch = selectThroughSR(driver, "fs-person-page", "fs-watch", "button")
                if "Regarder" in elwatch.text:
                    elwatch.click()
                    time.sleep(1)
                    clicked.append(identifier)
                    print("  clicked!")
            except:
                print("  no button")
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
        print("Total followed:", len(clicked), len(done))
            
        

if __name__ == "__main__":
    main()
