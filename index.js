const axios = require('axios');
const cheerio = require('cheerio');
const ms = require('ms');
const css = require('css');

async function fetchCSS(url) {
  try {
    const { data } = await axios.get(url, { timeout: ms('10s') });
    return data;
  } catch (error) {
    console.error(`Error fetching CSS from ${url}:`, error);
    return '';
  }
}

async function getFontsFromWebsite(url) {
  try {
    const { data: html } = await axios.get(url, { timeout: ms('10s') });
    const $ = cheerio.load(html);
    const fonts = new Set();

    // Function to add font family to the set
    const addFontFamily = (element) => {
      const fontFamily = $(element).css('font-family');
      if (fontFamily) {
        fonts.add(fontFamily);
      }
    };

    // Extract fonts from paragraphs and headlines
    $('p, h1, h2, h3, h4, h5, h6').each((index, element) => {
      addFontFamily(element);
    });

    // Extract fonts from <style> tags
    $('style').each((index, element) => {
      const styleContent = $(element).html();
      const parsedCSS = css.parse(styleContent);
      parsedCSS.stylesheet.rules.forEach(rule => {
        if (rule.declarations) {
          rule.declarations.forEach(declaration => {
            if (declaration.property === 'font-family') {
              fonts.add(declaration.value);
            }
          });
        }
      });
    });

    // Extract fonts from external CSS files
    const cssPromises = [];
    $('link[rel="stylesheet"]').each((index, element) => {
      const cssUrl = $(element).attr('href');
      if (cssUrl) {
        cssPromises.push(fetchCSS(cssUrl));
      }
    });

    const cssContents = await Promise.all(cssPromises);
    cssContents.forEach(content => {
      const parsedCSS = css.parse(content);
      parsedCSS.stylesheet.rules.forEach(rule => {
        if (rule.declarations) {
          rule.declarations.forEach(declaration => {
            if (declaration.property === 'font-family') {
              fonts.add(declaration.value);
            }
          });
        }
      });
    });

    return Array.from(fonts).slice(0, 2); // Return only the first two fonts
  } catch (error) {
    console.error('Error fetching or parsing website:', error);
    return [];
  }
}

// Example usage
const url = process.argv[2]; // Get the URL from command line arguments
if (!url) {
  console.error('Please provide a URL as the first argument.');
  process.exit(1);
}

getFontsFromWebsite(url).then(fonts => {
  console.log('Main fonts used on the website:', fonts);
});
