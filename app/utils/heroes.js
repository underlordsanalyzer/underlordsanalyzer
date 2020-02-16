export const parseHeroName = (name) => (
  name.split('-').reduce((complete, cur, index, arr) => {
    if (index === 0) {
      complete = `${cur.charAt(0).toUpperCase()}${cur.slice(1).toLowerCase()}`;
    } else if (index === arr.length - 1) {
      complete = `${complete} ${cur.charAt(0).toUpperCase()}${cur.slice(1).toLowerCase()}`;
    } else {
      complete = `${complete} ${cur.toLowerCase()}`;
    }
    return complete;
  }, ''));