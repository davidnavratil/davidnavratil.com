# Ruční doplňky, které vznikly až po posledním běhu původního řetězce (22. 11. 2026).
# Spouští se jako poslední krok vyrob.sh. Každá úprava musí najít svou kotvu právě jednou, jinak skript spadne.
import os
S = os.environ['GEN'].rstrip('/') + '/'
p = S + 'astro/src/data/prednasky.html'; h = open(p, encoding='utf8').read()
a = '<p class="mail">Nebo rovnou e-mailem: <a href="mailto:davidxnavratil@gmail.com">davidxnavratil@gmail.com</a></p>\n'
b = a + '          <p class="mail">Podklady pro pořadatele (bio, fotky, úvod pro moderátora): <a href="/pro-poradatele/">na jedné stránce</a></p>\n'
assert h.count(a) == 1, 'kotva pro odkaz na /pro-poradatele nenalezena'
h = h.replace(a, b); open(p, 'w', encoding='utf8').write(h); print('doplňky: odkaz na /pro-poradatele na /prednasky')
